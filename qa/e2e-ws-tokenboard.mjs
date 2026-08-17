// AHMS Round 5 — Browser-path E2E + live WebSocket token-board verification.
//
// Drives the running frontend exactly as a browser would: every HTTP call
// goes through the Vite dev proxy (http://localhost:5173 -> :8080) and the
// WebSocket connects to ws://localhost:5173/ws with the "ahms.<jwt>"
// subprotocol. Node >= 22 (global fetch + WebSocket) required.
//
// Usage: node qa/e2e-ws-tokenboard.mjs

const HTTP = 'http://localhost:5173'
const WS = 'ws://localhost:5173'
const SLOTS = ['09:00 AM', '10:00 AM', '11:30 AM', '12:30 PM', '02:00 PM', '03:30 PM', '04:30 PM', '05:30 PM']

const ok = (cond, label) => {
  const tag = cond ? 'PASS' : 'FAIL'
  console.log(`[${tag}] ${label}`)
  if (!cond) process.exitCode = 1
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(method, path, token, body) {
  const res = await fetch(`${HTTP}/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* non-json */ }
  return { status: res.status, json }
}

async function login(email, password) {
  const { status, json } = await api('POST', '/auth/login', null, { email, password })
  if (status !== 200) throw new Error(`login ${email} failed: ${status} ${JSON.stringify(json)}`)
  return json.data
}

// Websocket client w/ subprotocol auth; resolves on open, rejects on error.
function openWS(token, { expectReject = false } = {}) {
  return new Promise((resolve) => {
    const ws = new WebSocket(WS + '/ws', [`ahms.${token}`])
    const msgs = []
    let settled = false
    ws.onmessage = (e) => {
      msgs.push(JSON.parse(e.data))
    }
    ws.onopen = () => {
      if (!settled) { settled = true; resolve({ ws, msgs, err: null }) }
    }
    ws.onerror = () => {
      if (expectReject && !settled) { settled = true; resolve({ ws: null, msgs, err: 'rejected' }) }
    }
    ws.onclose = () => {
      if (!settled) { settled = true; resolve({ ws: null, msgs, err: 'closed-before-open' }) }
    }
    setTimeout(() => {
      if (!settled) {
        settled = true
        try { ws.close() } catch { /* ignore */ }
        resolve({ ws: null, msgs, err: 'timeout' })
      }
    }, 8000)
  })
}

// Wait for a message (type, optionally status) that arrived AFTER startIndex
// within the window; returns the payload or null. Scans forward from an
// index so repeated events of the same type don't match stale messages.
async function waitFor(msgs, type, status, startIndex, timeoutMs = 6000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    for (let i = startIndex; i < msgs.length; i++) {
      const m = msgs[i]
      if (m.type === type && (status === undefined || m.status === status)) return m
    }
    await sleep(100)
  }
  return null
}

async function main() {
  const recap = []
  console.log('═══ AHMS Round 5 E2E · WS token board ═══\n')

  // ---- 0. Preflight: find a doctor + department + patient for the flow ----
  const admin = await login('admin@ahms.local', 'ChangeMe123!')
  const reception = await login('demo.receptionist@ahms.local', 'Demo@12345')
  const doctor = await login('demo.panch@ahms.local', 'Demo@12345')

  let dr; {
    const { status, json } = await api('GET', '/doctors', admin.access_token)
    ok(status === 200, `doctors list via proxy (HTTP ${status})`)
    dr = json.data.find((d) => d.doctor_id === '44b4d57d-1b90-46c1-9a73-b733eb4176f2') || json.data.find((d) => d.email === 'demo.panch@ahms.local')
  }
  ok(!!dr, 'demo.panch doctor present in /doctors list')
  const doctorID = dr?.doctor_id || '44b4d57d-1b90-46c1-9a73-b733eb4176f2'

  let dept; {
    const { status, json } = await api('GET', '/departments', admin.access_token)
    dept = (json?.data || []).find((d) => d.code === 'PANCH')
    ok(!!dept, `Panchakarma department found (${dept?.name})`)
  }

  // Patient for this flow: the Round-4 test patient.
  const { status: ps, json: pj } = await api('GET', '/patients?search=Govt', admin.access_token)
  const patient = (pj?.data || []).find((p) => p.full_name === 'Test Govt ID Patient')
  ok(ps === 200 && !!patient, `test patient found (${patient?.uhid})`)

  const todayStamp = new Date().toISOString().slice(0, 10)
  const future = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10)

  // ---- 1. Receptionist WS open (token board's live subscriber) ----
  console.log('\n── 1. WebSocket: open board subscriber ──')
  const board = await openWS(reception.access_token)
  ok(!!board.ws, `receptionist WS open on ${WS}/ws (subprotocol ahms.<jwt>)`)

  // ---- 2. Public appointment booking -> NEW_APPOINTMENT push ----
  console.log('\n── 2. New appointment → token board auto-update (no refresh) ──')
  const mob = '9' + String(Math.floor(100000000 + Math.random() * 899999999))
  const bookBody = {
    full_name: 'E2E Walk-In Patient', mobile: mob,
    doctor_id: doctorID, appointment_date: future,
    time_slot: SLOTS[Math.floor(Math.random() * SLOTS.length)],
  }
  const s2 = board.msgs.length
  const t0 = Date.now()
  const { status: bok, json: bj } = await api('POST', '/public/appointments', null, bookBody)
  const bookLatency = Date.now() - t0
  ok(bok === 201, `public appointment booked (HTTP ${bok}, token ${bj?.data?.token_number}, latency ${bookLatency}ms)`)
  recap.push(`public booking → token ${bj?.data?.token_number} (${bookLatency}ms)`)

  const na = await waitFor(board.msgs, 'NEW_APPOINTMENT', undefined, s2)
  ok(na !== null, `WS pushed NEW_APPOINTMENT without page refresh (token ${na?.token_number} → ${na?.patient_name})`)
  if (na) {
    const d1 = Date.now() - t0
    console.log(`        push path: book(@:${t0}) → WS message (Δ ${d1}ms)`)
    recap.push(`WS NEW_APPOINTMENT Δ ${d1}ms`)
  }

  // ---- 3. Create encounter (receptionist) -> encounter_created push + token ----
  console.log('\n── 3. Reception creates OPD encounter (token generation) ──')
  const encReq = {
    patient_id: patient.id, department_id: dept.id, doctor_id: doctorID,
    encounter_type: 'OPD', visit_type: 'NEW',
  }
  const t1 = Date.now()
  const s3 = board.msgs.length
  const { status: eok, json: ej } = await api('POST', '/encounters', reception.access_token, encReq)
  ok(eok === 201, `encounter created (HTTP ${eok}, token ${ej?.data?.token_number}, status ${ej?.data?.status})`)
  const encID = ej?.data?.id
  const encToken = ej?.data?.token_number
  ok(encToken > 0, `encounter auto-token generated (${encToken})`)
  recap.push(`encounter → token ${encToken}`)

  const ec = await waitFor(board.msgs, 'encounter_created', undefined, s3)
  ok(ec !== null, `WS pushed encounter_created (status ${ec?.status}, token ${ec?.token_number})`)
  if (ec) recap.push(`WS encounter_created Δ ${Date.now() - t1}ms`)

  // Board data source check: /encounters (exactly what TokenBoard.load() calls)
  const { status: lkL, json: ljL } = await api('GET', '/encounters', reception.access_token)
  const encRow = (ljL?.data || []).find((x) => x.id === encID)
  ok(lkL === 200 && encRow?.status === 'REGISTERED', `board GET /encounters shows REGISTERED (latest=${encRow?.status})`)

  // ---- 4. Queue transitions → live pushes each step ----
  console.log('\n── 4. Queue lifecycle REGISTERED → WAITING → IN_CONSULTATION → COMPLETED ──')
  const steps = ['WAITING', 'IN_CONSULTATION', 'COMPLETED']
  for (const st of steps) {
    const tX = Date.now()
    const sN = board.msgs.length
    const { status: s, json: j } = await api('PATCH', `/encounters/${encID}/status`, reception.access_token, { status: st })
    ok(s === 200 && j?.data?.status === st, `PATCH → ${st} (HTTP ${s})`)
    const ev = await waitFor(board.msgs, 'encounter_updated', st, sN)
    ok(ev !== null, `WS pushed encounter_updated:${st} (Δ ${Date.now() - tX}ms)`)
    if (ev) recap.push(`encounter_updated ${st} Δ ${Date.now() - tX}ms`)
  }

  // ---- 5. Board data reflects final COMPLETED state ----
  const { json: ljF } = await api('GET', '/encounters', reception.access_token)
  const finalRow = (ljF?.data || []).find((x) => x.id === encID)
  ok(finalRow?.status === 'COMPLETED', `board GET /encounters reflects COMPLETED after WS-pushed refresh`)

  // ---- 6. appointment_updated broadcast (status change on appointments) ----
  console.log('\n── 5. Appointment status change → appointment_updated broadcast ──')
  const apptID = bj?.data?.id
  const tAp = Date.now()
  const sAp = board.msgs.length
  const { status: aok } = await api('PUT', `/appointments/${apptID}/status`, reception.access_token, { status: 'COMPLETED' })
  ok(aok === 200, `appointment status → COMPLETED (HTTP ${aok})`)
  const au = await waitFor(board.msgs, 'appointment_updated', undefined, sAp)
  ok(au !== null, `WS pushed appointment_updated (Δ ${Date.now() - tAp}ms)`)
  if (au) recap.push(`appointment_updated Δ ${Date.now() - tAp}ms`)

  // ---- 7. Role gating on the WS route (DOCTOR must be rejected) ----
  console.log('\n── 6. WS role gating (DOCTOR token → 403) ──')
  const docWS = await openWS(doctor.access_token, { expectReject: true })
  ok(docWS.err === 'rejected', `doctor token rejected on /ws ${docWS.err ? '' : '(unexpectedly OPEN)'}`)

  // ---- 8. Disconnect + reconnect still receives pushes ----
  console.log('\n── 7. Disconnect / reconnect ──')
  board.ws?.close()
  await sleep(300)
  const re = await openWS(reception.access_token)
  ok(!!re.ws, `reconnection opened a fresh socket`)
  const future2 = new Date(Date.now() + 11 * 86400000).toISOString().slice(0, 10)
  const mob2 = '8' + String(Math.floor(100000000 + Math.random() * 899999999))
  const tR = Date.now()
  const sR = re.msgs.length
  const { status: bok2 } = await api('POST', '/public/appointments', null, {
    full_name: 'E2E Reconnect Patient', mobile: mob2,
    doctor_id: doctorID, appointment_date: future2,
    time_slot: SLOTS[Math.floor(Math.random() * SLOTS.length)],
  })
  ok(bok2 === 201, `second booking after reconnect (HTTP ${bok2})`)
  const na2 = await waitFor(re.msgs, 'NEW_APPOINTMENT', undefined, sR)
  ok(na2 !== null, `reconnected socket still receives NEW_APPOINTMENT (Δ ${Date.now() - tR}ms)`)
  if (na2) recap.push(`reconnect NEW_APPOINTMENT Δ ${Date.now() - tR}ms`)
  re.ws?.close()

  console.log('\n═══ Summary ═══')
  recap.forEach((r) => console.log(' •', r))
  console.log(process.exitCode ? '\nRESULT: FAILURES PRESENT' : '\nRESULT: ALL CHECKS PASSED')
}

main().catch((e) => {
  console.error('E2E crashed:', e)
  process.exit(1)
})
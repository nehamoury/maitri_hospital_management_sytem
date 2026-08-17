// Diagnostic: why does a subprotocol-authenticated WebSocket fail to open?
const HTTP = 'http://localhost:5173'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(method, path, token, body) {
  const res = await fetch(`${HTTP}/api/v1${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { }
  return { status: res.status, json }
}

async function login(email, password) {
  const { status, json } = await api('POST', '/auth/login', null, { email, password })
  return json.data
}

function tryWS(url, protocols, label) {
  return new Promise((resolve) => {
    const ws = protocols ? new WebSocket(url, protocols) : new WebSocket(url)
    const t = setTimeout(() => { ws.close(); resolve({ label, outcome: 'TIMEOUT(unopened)' }) }, 7000)
    ws.onopen = () => {
      clearTimeout(t)
      console.log(`[DIAG][${label}] OPEN ✓ (subprotocol echoed: ${ws.protocol})`)
      ws.close()
      resolve({ label, outcome: 'OPEN', protocol: ws.protocol })
    }
    ws.onerror = (e) => {
      console.log(`[DIAG][${label}] ERROR event. readyState=${ws.readyState} message=${e?.message ?? '(no message)'}`)
    }
    ws.onclose = (e) => {
      clearTimeout(t)
      console.log(`[DIAG][${label}] CLOSE code=${e.code} reason="${e.reason}"`, e.code === 1006 ? '(handshake failed)' : '')
      resolve({ label, outcome: 'CLOSE', code: e.code })
    }
  })
}

async function main() {
  const reception = await login('demo.receptionist@ahms.local', 'Demo@12345')
  const tok = reception.access_token

  // A) Server's raw handshake response when token in subprotocol:
  console.log('⟐ Raw upgrade attempt with token subprotocol (no WS engine):')
  const raw = await fetch('http://localhost:8080/ws', {
    headers: {
      Connection: 'Upgrade',
      Upgrade: 'websocket',
      'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
      'Sec-WebSocket-Version': '13',
      'Sec-WebSocket-Protocol': `ahms.${tok}`,
    },
  })
  console.log(`   HTTP status=${raw.status}`)
  console.log(`   Sec-WebSocket-Protocol response header = "${raw.headers.get('sec-websocket-protocol')}"`)
  console.log(`   Location/Upgrade echoed: ${raw.headers.get('upgrade')}`)

  // B) Real undici client with subprotocol (mimics browser exactly):
  await tryWS('ws://localhost:8080/ws', [`ahms.${tok}`], 'B: browser-mimic subprotocol')
  // C) Through vite proxy (real browser path)
  await tryWS('ws://localhost:5173/ws', [`ahms.${tok}`], 'C: via vite proxy')

  // D) Raw handshake WITHOUT subprotocol (server should 401 missing token)
  const raw2 = await fetch('http://localhost:8080/ws', {
    headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', 'Sec-WebSocket-Version': '13' },
  })
  console.log(`⟐ Upgrade with NO subprotocol: HTTP ${raw2.status} (expect 401 missing token)`)
}

main().catch((e) => { console.error('diag crashed', e); process.exit(1) })
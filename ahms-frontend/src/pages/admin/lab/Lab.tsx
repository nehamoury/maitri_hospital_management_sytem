import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../lib/auth'
import { labApi } from '@/lib/api'
import type { LabOrder } from '@/lib/api'
import { Button } from '@/components/ui'
import { LabOrderList } from './components/LabOrderList'
import { LabOrderDetail } from './components/LabOrderDetail'
import { TestMasterList } from './components/TestMasterList'
import { CreateOrderModal } from './components/CreateOrderModal'
import { SampleCollectionModal } from './components/SampleCollectionModal'
import { ResultEntryModal } from './components/ResultEntryModal'
import { DoctorReviewModal } from './components/DoctorReviewModal'
import { FlaskConical, Plus, ClipboardList } from 'lucide-react'

export default function Lab() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<'orders' | 'master'>('orders')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(searchParams.get('order_id'))
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null)
  
  // Modals
  const [showCreate, setShowCreate] = useState(false)
  const [showCollect, setShowCollect] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [showReview, setShowReview] = useState(false)

  // Permissions check
  const permissions = user?.permissions ?? []
  const canView = permissions.includes('lab.view')
  const canOrder = permissions.includes('lab.order')
  const canCollect = permissions.includes('lab.collect')
  const canResult = permissions.includes('lab.result')
  const canVerify = permissions.includes('lab.verify')
  const canReview = permissions.includes('lab.review')
  const canManage = permissions.includes('lab.manage')

  const fetchSelectedOrder = async (id: string) => {
    try {
      const res = await labApi.getOrder(id)
      if (res.data.success) {
        setSelectedOrder(res.data.data)
      }
    } catch { /* ignored */ }
  }

  useEffect(() => {
    if (selectedOrderId) {
      fetchSelectedOrder(selectedOrderId)
    } else {
      setSelectedOrder(null)
    }
  }, [selectedOrderId])

  if (!canView) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground text-sm">You do not have permission to view the Lab module.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
            <FlaskConical size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Laboratory & Investigations</h1>
            <p className="text-sm text-muted-foreground">Manage lab orders, sample collections, testing workflow and reports.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canOrder && (
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New Lab Order
            </Button>
          )}
          {selectedOrder && (
            <>
              {canCollect && selectedOrder.status === 'ORDERED' && (
                <Button variant="secondary" onClick={() => setShowCollect(true)}>
                  Collect Sample
                </Button>
              )}
              {canResult && (selectedOrder.status === 'PROCESSING' || selectedOrder.status === 'SAMPLE_COLLECTED') && (
                <Button variant="secondary" onClick={() => setShowResult(true)}>
                  <ClipboardList size={14} className="mr-1" /> Enter Results
                </Button>
              )}
              {canReview && selectedOrder.status === 'RESULT_AVAILABLE' && (
                <Button variant="secondary" onClick={() => setShowReview(true)}>
                  Doctor Review
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      {!selectedOrderId && (
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
              activeTab === 'orders'
                ? 'border-teal-600 text-teal-600 font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Active Orders
          </button>
          {canManage && (
            <button
              onClick={() => setActiveTab('master')}
              className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 -mb-[2px] ${
                activeTab === 'master'
                  ? 'border-teal-600 text-teal-600 font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Test Master Catalog
            </button>
          )}
        </div>
      )}

      {/* Detail vs List View */}
      {selectedOrderId ? (
        <LabOrderDetail
          orderId={selectedOrderId}
          onBack={() => {
            setSelectedOrderId(null)
            setSearchParams({})
          }}
          onWorkflowAction={() => {
            if (selectedOrderId) fetchSelectedOrder(selectedOrderId)
          }}
          canCollect={canCollect}
          canResult={canResult}
          canVerify={canVerify}
          canReview={canReview}
        />
      ) : activeTab === 'orders' ? (
        <LabOrderList onSelect={setSelectedOrderId} />
      ) : (
        <TestMasterList />
      )}

      {/* Modals */}
      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            // Refresh order list if on orders tab
            setActiveTab('orders')
          }}
        />
      )}

      {showCollect && selectedOrderId && (
        <SampleCollectionModal
          orderId={selectedOrderId}
          onClose={() => setShowCollect(false)}
          onDone={() => {
            setShowCollect(false)
            fetchSelectedOrder(selectedOrderId)
          }}
        />
      )}

      {showResult && selectedOrderId && selectedOrder && (
        <ResultEntryModal
          orderId={selectedOrderId}
          items={selectedOrder.items}
          onClose={() => setShowResult(false)}
          onDone={() => {
            setShowResult(false)
            fetchSelectedOrder(selectedOrderId)
          }}
        />
      )}

      {showReview && selectedOrderId && (
        <DoctorReviewModal
          orderId={selectedOrderId}
          onClose={() => setShowReview(false)}
          onDone={() => {
            setShowReview(false)
            fetchSelectedOrder(selectedOrderId)
          }}
        />
      )}
    </div>
  )
}

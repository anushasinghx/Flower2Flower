import { useState } from 'react'
import {
  AdminPage,
  DataTable,
  DetailRow,
  MasterDetail,
  NoteBar,
  PhotoTile,
  SearchBox,
  type Column,
} from './parts'
import {
  Button,
  Chips,
  Field,
  Pill,
  TextArea,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { decideKyc, logUnmask } from '../../store/actions'
import type { KycRequest } from '../../store/types'
import { maskDocument, maskMobile } from '../../utils/points'

type Tab = 'pending' | 'verified' | 'rejected' | 'all'

const StatusPill = ({ status }: { status: KycRequest['status'] }) => {
  const t = useT()

  if (status === 'verified') return <Pill tone="green">{t('Verified')}</Pill>
  if (status === 'rejected') return <Pill tone="warning">{t('Rejected')}</Pill>
  return <Pill tone="marigold">{t('Pending')}</Pill>
}

const UserKyc = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const [tab, setTab] = useState<Tab>('pending')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [revealed, setRevealed] = useState<string[]>([])

  const requests = state.kycRequests
  const pendingCount = requests.filter((item) => item.status === 'pending').length
  const rows = requests.filter(
    (item) =>
      (tab === 'all' || item.status === tab) &&
      `${item.name} ${item.id}`.toLowerCase().includes(query.trim().toLowerCase()),
  )
  const selected = requests.find((item) => item.id === selectedId) ?? null
  const isRevealed = selected ? revealed.includes(selected.id) : false

  const close = () => {
    setSelectedId(null)
    setReason('')
    setReasonError('')
  }

  const decide = (approve: boolean) => {
    if (!selected) return

    if (!approve && !reason.trim()) {
      setReasonError(t('A reason is required to reject.'))
      return
    }

    run((current) =>
      decideKyc(current, selected.id, approve, approve ? '' : reason.trim()),
    )
    toast(
      approve
        ? t('{name} is now verified.', { name: selected.name })
        : t('{name} was rejected.', { name: selected.name }),
    )
    close()
  }

  const reveal = () => {
    if (!selected) return
    setRevealed([...revealed, selected.id])
    run((current) => logUnmask(current, selected.id))
  }

  const columns: Column<KycRequest>[] = [
    { key: 'name', header: t('User'), render: (row) => row.name },
    {
      key: 'mobile',
      header: t('Mobile'),
      render: (row) => maskMobile(row.mobile),
    },
    { key: 'doc', header: t('Document'), render: (row) => t(row.docType) },
    { key: 'submitted', header: t('Submitted'), render: (row) => row.submitted },
    {
      key: 'status',
      header: t('Status'),
      render: (row) => <StatusPill status={row.status} />,
    },
  ]

  return (
    <AdminPage
      title={t('User KYC review')}
      actions={
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder={t('Search name or ID')}
        />
      }
    >
      <Chips<Tab>
        label={t('Filter by status')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pending', label: `${t('Pending')} (${pendingCount})` },
          { value: 'verified', label: t('Verified') },
          { value: 'rejected', label: t('Rejected') },
          { value: 'all', label: t('All') },
        ]}
      />

      <MasterDetail
        open={selected !== null}
        onClose={close}
        title={selected ? `${selected.name} · ${maskMobile(selected.mobile)}` : ''}
        placeholder={t('Select a user to review')}
        list={
          <DataTable
            label={t('User KYC review')}
            rows={rows}
            columns={columns}
            rowKey={(row) => row.id}
            selectedKey={selectedId}
            onRowClick={(row) => {
              setSelectedId(row.id)
              setReason('')
              setReasonError('')
            }}
            emptyTitle={t('No users in this list')}
          />
        }
        detail={
          selected && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted">{selected.id}</span>
                <StatusPill status={selected.status} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <PhotoTile label={t('ID front')} />
                <PhotoTile label={t('ID back')} />
              </div>
              <div>
                <DetailRow label={t('Name on ID')}>{selected.name}</DetailRow>
                <DetailRow label={t('Date of birth, age')}>
                  {selected.dob} · 18+
                </DetailRow>
                <DetailRow label={t('Document number')}>
                  {isRevealed
                    ? selected.docNumber
                    : maskDocument(selected.docNumber)}{' '}
                  {!isRevealed && (
                    <button
                      type="button"
                      onClick={reveal}
                      className="ml-1 text-sm font-medium text-marigold underline underline-offset-4"
                    >
                      {t('Reveal')}
                    </button>
                  )}
                </DetailRow>
                <DetailRow label={t('Consents')}>
                  {t('{value} logged', {
                    value: selected.consents.replace(' of ', ` ${t('of')} `),
                  })}
                </DetailRow>
                {selected.reason && (
                  <DetailRow label={t('Reason')}>{t(selected.reason)}</DetailRow>
                )}
              </div>

              {selected.status === 'pending' && (
                <>
                  <Field
                    label={t('Reason (required to reject)')}
                    error={reasonError}
                  >
                    {(id) => (
                      <TextArea
                        id={id}
                        value={reason}
                        onChange={(event) => {
                          setReasonError('')
                          setReason(event.target.value)
                        }}
                      />
                    )}
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Button full icon="check" onClick={() => decide(true)}>
                      {t('Approve')}
                    </Button>
                    <Button variant="danger" full onClick={() => decide(false)}>
                      {t('Reject')}
                    </Button>
                  </div>
                </>
              )}
              <NoteBar>
                {t(
                  'Data is masked by default. Revealing it is written to the audit log.',
                )}
              </NoteBar>
            </div>
          )
        }
      />
    </AdminPage>
  )
}

export default UserKyc

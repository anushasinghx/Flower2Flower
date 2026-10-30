import { useState } from 'react'
import {
  AdminPage,
  DataTable,
  DetailRow,
  HistoryList,
  MasterDetail,
  NoteBar,
  PhotoTile,
  type Column,
} from './parts'
import {
  Button,
  CheckRow,
  Chips,
  Field,
  Pill,
  RadioRow,
  Segmented,
  Sheet,
  TextArea,
  TextInput,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { addTemple, decideTemple } from '../../store/actions'
import type { Temple, TempleStatus, TempleType } from '../../store/types'
import { maskMobile } from '../../utils/points'

type Tab = 'pending' | 'verified' | 'needsChanges' | 'all'

const badges = ['Verified', 'Registered', 'Unregistered']
const checklist = [
  'Documents readable',
  'Name and address match',
  'Location confirmed on map',
]

const StatusPill = ({ status }: { status: TempleStatus }) => {
  const t = useT()

  if (status === 'verified') return <Pill tone="green">{t('Verified')}</Pill>
  if (status === 'needsChanges') {
    return <Pill tone="warning">{t('Needs changes')}</Pill>
  }
  return <Pill tone="marigold">{t('Pending')}</Pill>
}

const TempleDetail = ({
  temple,
  onDone,
}: {
  temple: Temple
  onDone: () => void
}) => {
  const { run, toast } = useStore()
  const t = useT()
  const [checks, setChecks] = useState<string[]>([])
  const [badge, setBadge] = useState(
    temple.type === 'registered' ? 'Registered' : 'Verified',
  )
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')
  const allChecked = checks.length === checklist.length
  const open = temple.status !== 'verified'

  const verify = () => {
    run((current) =>
      decideTemple(current, temple.id, 'verified', badge, ''),
    )
    toast(t('{name} is verified. It now appears as a pickup point.', {
      name: temple.name,
    }))
    onDone()
  }

  const requestChanges = () => {
    if (!note.trim()) {
      setNoteError(t('Say what needs to change.'))
      return
    }
    run((current) =>
      decideTemple(current, temple.id, 'needsChanges', '', note.trim()),
    )
    toast(t('Changes requested from {name}.', { name: temple.name }))
    onDone()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Pill>{t(temple.type === 'registered' ? 'Registered' : 'Unregistered')}</Pill>
        <StatusPill status={temple.status} />
      </div>
      <div>
        <DetailRow label={t('Address')}>{temple.address}</DetailRow>
        <DetailRow label={t('Contact')}>
          {temple.contact} · {maskMobile(temple.mobile)}
        </DetailRow>
        <DetailRow label={t('Counter open')}>{t(temple.timings)}</DetailRow>
        {temple.badge && <DetailRow label={t('Badge')}>{t(temple.badge)}</DetailRow>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <PhotoTile
          label={
            temple.type === 'registered'
              ? t('Registration certificate')
              : t('Committee letter')
          }
        />
        <PhotoTile label={t('Admin ID proof')} />
      </div>
      {temple.note && (
        <p className="rounded-2xl border border-sindoor/50 p-3 text-sindoor">
          {t(temple.note)}
        </p>
      )}

      {open && (
        <>
          <fieldset>
            <legend className="mb-1 font-semibold">{t('Checklist')}</legend>
            {checklist.map((item) => (
              <CheckRow
                key={item}
                checked={checks.includes(item)}
                onChange={(value) =>
                  setChecks(
                    value
                      ? [...checks, item]
                      : checks.filter((check) => check !== item),
                  )
                }
              >
                {t(item)}
              </CheckRow>
            ))}
          </fieldset>
          <fieldset>
            <legend className="font-semibold">{t('Badge to assign')}</legend>
            <div className="flex flex-wrap gap-x-5">
              {badges.map((item) => (
                <RadioRow
                  key={item}
                  name="badge"
                  checked={badge === item}
                  onChange={() => setBadge(item)}
                >
                  {t(item)}
                </RadioRow>
              ))}
            </div>
          </fieldset>
          <Button full disabled={!allChecked} icon="badge" onClick={verify}>
            {t('Verify and issue badge')}
          </Button>
          <Field label={t('What needs to change?')} error={noteError}>
            {(id) => (
              <TextArea
                id={id}
                value={note}
                onChange={(event) => {
                  setNoteError('')
                  setNote(event.target.value)
                }}
              />
            )}
          </Field>
          <Button variant="danger" full onClick={requestChanges}>
            {t('Request changes')}
          </Button>
        </>
      )}

      <div>
        <p className="mb-1 font-semibold">{t('Status history')}</p>
        <HistoryList items={temple.history} />
      </div>
      <NoteBar>
        {t('Verified temples appear for devotees and as pickup points at checkout.')}
      </NoteBar>
    </div>
  )
}

const Temples = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const [tab, setTab] = useState<Tab>('pending')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<TempleType>('registered')
  const [address, setAddress] = useState('')
  const [contact, setContact] = useState('')
  const [mobile, setMobile] = useState('')

  const temples = state.temples
  const count = (status: TempleStatus) =>
    temples.filter((item) => item.status === status).length
  const rows = temples.filter((item) => tab === 'all' || item.status === tab)
  const selected = temples.find((item) => item.id === selectedId) ?? null
  const canAdd =
    name.trim() && address.trim() && contact.trim() && /^[6-9]\d{9}$/.test(mobile)

  const saveTemple = () => {
    run((current) =>
      addTemple(current, {
        name: name.trim(),
        type,
        address: address.trim(),
        contact: contact.trim(),
        mobile,
      }),
    )
    setAdding(false)
    setName('')
    setAddress('')
    setContact('')
    setMobile('')
    setTab('pending')
    toast(t('Temple added to the list to verify.'))
  }

  const columns: Column<Temple>[] = [
    { key: 'name', header: t('Temple'), render: (row) => row.name },
    {
      key: 'type',
      header: t('Type'),
      render: (row) =>
        t(row.type === 'registered' ? 'Registered' : 'Unregistered'),
    },
    {
      key: 'status',
      header: t('Status'),
      render: (row) => <StatusPill status={row.status} />,
    },
  ]

  return (
    <AdminPage
      title={t('Temple registry')}
      actions={
        <Button icon="plus" onClick={() => setAdding(true)}>
          {t('Add temple')}
        </Button>
      }
    >
      <Chips<Tab>
        label={t('Filter by status')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pending', label: `${t('To verify')} (${count('pending')})` },
          { value: 'verified', label: `${t('Verified')} (${count('verified')})` },
          { value: 'needsChanges', label: t('Needs changes') },
          { value: 'all', label: t('All') },
        ]}
      />

      <MasterDetail
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ''}
        placeholder={t('Select a temple to review')}
        list={
          <DataTable
            label={t('Temple registry')}
            rows={rows}
            columns={columns}
            rowKey={(row) => row.id}
            selectedKey={selectedId}
            onRowClick={(row) => setSelectedId(row.id)}
            emptyTitle={t('No temples in this list')}
          />
        }
        detail={
          selected && (
            <TempleDetail
              key={selected.id}
              temple={selected}
              onDone={() => setSelectedId(null)}
            />
          )
        }
      />

      <Sheet
        open={adding}
        title={t('Add temple')}
        onClose={() => setAdding(false)}
        footer={
          <Button full disabled={!canAdd} onClick={saveTemple}>
            {t('Save temple')}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Segmented<TempleType>
            label={t('Type')}
            value={type}
            onChange={setType}
            options={[
              { value: 'registered', label: t('Registered') },
              { value: 'unregistered', label: t('Unregistered') },
            ]}
          />
          <Field label={t('Temple name')}>
            {(id) => (
              <TextInput
                id={id}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            )}
          </Field>
          <Field label={t('Address and location')}>
            {(id) => (
              <TextInput
                id={id}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder={t('Street, area, city, PIN')}
              />
            )}
          </Field>
          <Field label={t('Contact person')}>
            {(id) => (
              <TextInput
                id={id}
                value={contact}
                onChange={(event) => setContact(event.target.value)}
              />
            )}
          </Field>
          <Field label={t('Mobile number')}>
            {(id) => (
              <TextInput
                id={id}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(event) =>
                  setMobile(event.target.value.replace(/\D/g, ''))
                }
              />
            )}
          </Field>
        </div>
      </Sheet>
    </AdminPage>
  )
}

export default Temples

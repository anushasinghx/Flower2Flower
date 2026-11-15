import { useState } from 'react'
import { AdminPage, DataTable, NoteBar, type Column } from './parts'
import Icon from '../../components/ui/Icon'
import {
  Button,
  Card,
  Field,
  Pill,
  Select,
  Sheet,
  TextInput,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { saveStaff } from '../../store/actions'
import type { Staff, StaffRole } from '../../store/types'
import { maskMobile } from '../../utils/points'
import { DEMO_ADMIN_MOBILE } from '../../services/mockData'

const roleLabels: Record<StaffRole, string> = {
  admin: 'Admin',
  operator: 'Operator',
  templeAdmin: 'Temple admin',
}

type Access = 'yes' | 'own' | 'no'

const matrix: { area: string; access: Access[] }[] = [
  { area: 'Own profile, points, orders', access: ['yes', 'no', 'no', 'no'] },
  { area: 'Collection and deposits', access: ['no', 'yes', 'no', 'yes'] },
  { area: 'Temple profile and KYC', access: ['no', 'no', 'own', 'yes'] },
  { area: 'User KYC review', access: ['no', 'no', 'no', 'yes'] },
  { area: 'Batches and stock', access: ['no', 'no', 'no', 'yes'] },
  { area: 'Orders and catalogue', access: ['own', 'no', 'no', 'yes'] },
  { area: 'Rules, alerts, held points', access: ['no', 'no', 'no', 'yes'] },
  { area: 'Unmasked data, export', access: ['no', 'no', 'no', 'yes'] },
]

const AccessCell = ({ value }: { value: Access }) => {
  const t = useT()

  if (value === 'yes') {
    return (
      <span className="text-tulsi">
        <Icon name="check" size={20} />
        <span className="sr-only">{t('Yes')}</span>
      </span>
    )
  }
  if (value === 'own') return <span className="text-sm">{t('own')}</span>
  return (
    <span className="text-muted" aria-label={t('No')}>
      ·
    </span>
  )
}

const blankStaff = (): Staff => ({
  id: `e${Date.now()}`,
  name: '',
  mobile: '',
  role: 'operator',
  status: 'active',
})

const UsersRoles = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const [editing, setEditing] = useState<Staff | null>(null)
  const isNew =
    editing !== null && !state.staff.some((item) => item.id === editing.id)
  const canSave =
    editing !== null &&
    editing.name.trim() !== '' &&
    /^[6-9]\d{9}$/.test(editing.mobile)

  const columns: Column<Staff>[] = [
    { key: 'name', header: t('Name'), render: (row) => row.name },
    {
      key: 'mobile',
      header: t('Mobile'),
      render: (row) =>
        row.mobile === DEMO_ADMIN_MOBILE ? row.mobile : maskMobile(row.mobile),
    },
    { key: 'role', header: t('Role'), render: (row) => t(roleLabels[row.role]) },
    {
      key: 'status',
      header: t('Status'),
      render: (row) =>
        row.status === 'active' ? (
          <Pill tone="green">{t('Active')}</Pill>
        ) : (
          <Pill tone="warning">{t('Suspended')}</Pill>
        ),
    },
  ]

  return (
    <AdminPage
      title={t('Users and roles')}
      actions={
        <Button icon="plus" onClick={() => setEditing(blankStaff())}>
          {t('Invite staff')}
        </Button>
      }
    >
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{t('Staff')}</h2>
        <DataTable
          label={t('Staff')}
          rows={state.staff}
          columns={columns}
          rowKey={(row) => row.id}
          selectedKey={editing?.id}
          onRowClick={(row) => setEditing(row)}
          emptyTitle={t('No staff yet')}
        />
        <p className="text-sm text-muted">
          {t('Mobile numbers and KYC data are masked for every role except Admin.')}
        </p>
      </section>

      <Card>
        <h2 className="mb-3 text-lg font-bold">{t('Role access matrix')}</h2>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-sm text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">
                  {t('Area')}
                </th>
                {['Devotee', 'Operator', 'Temple', 'Admin'].map((role) => (
                  <th key={role} scope="col" className="px-3 py-2 font-medium">
                    {t(role)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.area} className="border-b border-line last:border-b-0">
                  <th scope="row" className="py-3 pr-3 font-normal">
                    {t(row.area)}
                  </th>
                  {row.access.map((value, index) => (
                    <td key={index} className="px-3 py-3">
                      <AccessCell value={value} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <NoteBar>
        {t(
          'Role based access is enforced on the server. Devotees and operators see masked data such as ******1234. Role changes are written to the audit log.',
        )}
      </NoteBar>

      <Sheet
        open={editing !== null}
        title={isNew ? t('Invite staff') : t('Edit staff')}
        onClose={() => setEditing(null)}
        footer={
          editing && (
            <Button
              full
              disabled={!canSave}
              onClick={() => {
                run((current) => saveStaff(current, editing))
                setEditing(null)
                toast(isNew ? t('Invite sent.') : t('Staff details saved.'))
              }}
            >
              {isNew ? t('Send invite') : t('Save')}
            </Button>
          )
        }
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <Field label={t('Name')}>
              {(id) => (
                <TextInput
                  id={id}
                  value={editing.name}
                  onChange={(event) =>
                    setEditing({ ...editing, name: event.target.value })
                  }
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
                  disabled={!isNew}
                  value={isNew ? editing.mobile : maskMobile(editing.mobile)}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      mobile: event.target.value.replace(/\D/g, ''),
                    })
                  }
                />
              )}
            </Field>
            <Field label={t('Role')}>
              {(id) => (
                <Select
                  id={id}
                  value={editing.role}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      role: event.target.value as StaffRole,
                    })
                  }
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {t(label)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('Status')}>
              {(id) => (
                <Select
                  id={id}
                  value={editing.status}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      status: event.target.value as Staff['status'],
                    })
                  }
                >
                  <option value="active">{t('Active')}</option>
                  <option value="suspended">{t('Suspended')}</option>
                </Select>
              )}
            </Field>
          </div>
        )}
      </Sheet>
    </AdminPage>
  )
}

export default UsersRoles

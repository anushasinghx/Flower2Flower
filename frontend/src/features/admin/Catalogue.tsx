import { useState } from 'react'
import { AdminPage, DataTable, NoteBar, type Column } from './parts'
import {
  Button,
  Field,
  Pill,
  Select,
  Sheet,
  TextInput,
} from '../../components/ui/kit'
import { useStore, useT } from '../../store/appStore'
import { saveProduct } from '../../store/actions'
import type { Product } from '../../store/types'
import { formatNumber, stockTone } from '../../utils/points'

const categories = ['Manure', 'Vermicompost', 'Saplings', 'Kits']

const blankProduct = (): Product => ({
  id: `p${Date.now()}`,
  group: `group${Date.now()}`,
  name: '',
  nameHi: '',
  category: 'Manure',
  pack: '',
  price: 0,
  points: 0,
  stock: 0,
  listed: true,
})

const Catalogue = () => {
  const { state, run, toast } = useStore()
  const t = useT()
  const [editing, setEditing] = useState<Product | null>(null)
  const isNew =
    editing !== null &&
    !state.products.some((product) => product.id === editing.id)

  const change = (update: Partial<Product>) =>
    setEditing((current) => (current ? { ...current, ...update } : current))

  const save = (product: Product) => {
    run((current) => saveProduct(current, product))
    setEditing(null)
    toast(t('Catalogue updated.'))
  }

  const columns: Column<Product>[] = [
    { key: 'name', header: t('Product'), render: (row) => t(row.name) },
    { key: 'pack', header: t('Pack'), render: (row) => row.pack },
    { key: 'price', header: t('Price (₹)'), render: (row) => row.price },
    {
      key: 'points',
      header: t('Points price'),
      render: (row) => formatNumber(row.points),
    },
    {
      key: 'stock',
      header: t('Stock'),
      render: (row) => {
        const tone = stockTone(row.stock)
        return (
          <span className={tone === 'in' ? '' : 'text-sindoor'}>
            {row.stock}
            {tone === 'low' && ` · ${t('Low')}`}
            {tone === 'out' && ` · ${t('Out')}`}
          </span>
        )
      },
    },
    {
      key: 'listed',
      header: t('Status'),
      render: (row) =>
        row.listed ? (
          <Pill tone="green">{t('Listed')}</Pill>
        ) : (
          <Pill>{t('Hidden')}</Pill>
        ),
    },
  ]

  return (
    <AdminPage
      title={t('Product catalogue')}
      actions={
        <Button icon="plus" onClick={() => setEditing(blankProduct())}>
          {t('Add product')}
        </Button>
      }
    >
      <DataTable
        label={t('Product catalogue')}
        rows={state.products}
        columns={columns}
        rowKey={(row) => row.id}
        selectedKey={editing?.id}
        onRowClick={(row) => setEditing(row)}
        emptyTitle={t('No products yet')}
      />

      <NoteBar>
        {t(
          'Stock is read only here. It changes through batch output, orders and logged manual adjustments. Prices are in INR, and checkout is mock in Phase 1.',
        )}
      </NoteBar>

      <Sheet
        open={editing !== null}
        title={isNew ? t('Add product') : t('Edit product')}
        onClose={() => setEditing(null)}
        footer={
          editing && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                full
                disabled={!editing.name.trim() || !editing.pack.trim()}
                onClick={() => save(editing)}
              >
                {t('Save')}
              </Button>
              {!isNew && (
                <Button
                  variant="secondary"
                  full
                  onClick={() => save({ ...editing, listed: !editing.listed })}
                >
                  {editing.listed ? t('Hide product') : t('List product')}
                </Button>
              )}
            </div>
          )
        }
      >
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label={t('Name (English)')}>
                {(id) => (
                  <TextInput
                    id={id}
                    value={editing.name}
                    onChange={(event) => change({ name: event.target.value })}
                  />
                )}
              </Field>
            </div>
            <div className="col-span-2">
              <Field label={t('Name (Hindi)')}>
                {(id) => (
                  <TextInput
                    id={id}
                    lang="hi"
                    value={editing.nameHi}
                    onChange={(event) => change({ nameHi: event.target.value })}
                  />
                )}
              </Field>
            </div>
            <Field label={t('Category')}>
              {(id) => (
                <Select
                  id={id}
                  value={editing.category}
                  onChange={(event) => change({ category: event.target.value })}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {t(category)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t('Pack')}>
              {(id) => (
                <TextInput
                  id={id}
                  value={editing.pack}
                  placeholder="1 kg"
                  onChange={(event) => change({ pack: event.target.value })}
                />
              )}
            </Field>
            <Field label={t('Price (₹)')}>
              {(id) => (
                <TextInput
                  id={id}
                  inputMode="numeric"
                  value={editing.price}
                  onChange={(event) =>
                    change({
                      price: Number(event.target.value.replace(/\D/g, '')),
                    })
                  }
                />
              )}
            </Field>
            <Field label={t('Points price')}>
              {(id) => (
                <TextInput
                  id={id}
                  inputMode="numeric"
                  value={editing.points}
                  onChange={(event) =>
                    change({
                      points: Number(event.target.value.replace(/\D/g, '')),
                    })
                  }
                />
              )}
            </Field>
            <div className="col-span-2">
              <Field label={t('Photos')}>
                {(id) => (
                  <TextInput id={id} type="file" accept="image/*" multiple />
                )}
              </Field>
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-2xl border border-line px-4 py-3">
              <span className="text-muted">{t('Stock (read only)')}</span>
              <span className="font-semibold">{editing.stock}</span>
            </div>
          </div>
        )}
      </Sheet>
    </AdminPage>
  )
}

export default Catalogue

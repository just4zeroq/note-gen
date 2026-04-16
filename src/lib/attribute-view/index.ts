/**
 * 属性视图存储和状态管理
 */

import { create } from 'zustand'
import {
  AttributeView,
  AVColumn,
  AVView,
  AVTableData,
  AVDetail,
  createAttributeView,
  getAttributeViews,
  getAttributeViewDetail,
  getAVRows,
  addAVColumn,
  updateAVColumn,
  deleteAVColumn,
  addAVRow,
  deleteAVRow,
  setAVCell,
  deleteAttributeView,
  addAVView,
  updateAVView,
  deleteAVView,
  renameAttributeView,
  generateId,
} from './tauri'
import useSettingStore from '@/stores/setting'

interface AVState {
  // 加载状态
  loading: boolean
  error: string | null

  // 当前属性视图
  currentAV: AttributeView | null
  columns: AVColumn[]
  views: AVView[]
  tableData: AVTableData | null
  activeViewId: string | null

  // 动作
  loadAttributeViews: () => Promise<void>
  loadAVDetail: (avId: string) => Promise<void>
  createAV: (name: string) => Promise<AttributeView>
  deleteAV: (id: string) => Promise<void>
  renameAV: (id: string, name: string) => Promise<void>

  // 列操作
  createColumn: (name: string, columnType: string, options?: string) => Promise<void>
  updateColumn: (id: string, updates: Partial<AVColumn>) => Promise<void>
  deleteColumn: (id: string) => Promise<void>

  // 行操作
  createRow: (blockId: string) => Promise<void>
  deleteRow: (id: string) => Promise<void>
  updateCell: (rowId: string, columnId: string, value: any) => Promise<void>

  // 视图操作
  createView: (name: string, viewType: 'table' | 'gallery' | 'kanban') => Promise<void>
  updateView: (id: string, updates: Partial<AVView>) => Promise<void>
  deleteView: (id: string) => Promise<void>
  setActiveView: (viewId: string) => void
}

export const useAVStore = create<AVState>((set, get) => ({
  loading: false,
  error: null,
  currentAV: null,
  columns: [],
  views: [],
  tableData: null,
  activeViewId: null,

  loadAttributeViews: async () => {
    const workspacePath = useSettingStore.getState().workspacePath
    if (!workspacePath) return

    set({ loading: true, error: null })
    try {
      const avs = await getAttributeViews(workspacePath)
      set({ loading: false })
    } catch (error) {
      set({ loading: false, error: String(error) })
    }
  },

  loadAVDetail: async (avId: string) => {
    set({ loading: true, error: null })
    try {
      const detail = await getAttributeViewDetail(avId)
      const tableData = await getAVRows(avId)

      set({
        currentAV: detail.attributeView,
        columns: detail.columns,
        views: detail.views,
        tableData,
        activeViewId: detail.views[0]?.id || null,
        loading: false,
      })
    } catch (error) {
      set({ loading: false, error: String(error) })
    }
  },

  createAV: async (name: string) => {
    const workspacePath = useSettingStore.getState().workspacePath
    if (!workspacePath) throw new Error('No workspace')

    const id = generateId()
    const av = await createAttributeView(id, name, workspacePath)
    await get().loadAVDetail(id)
    return av
  },

  deleteAV: async (id: string) => {
    await deleteAttributeView(id)
    set({ currentAV: null, columns: [], views: [], tableData: null })
  },

  renameAV: async (id: string, name: string) => {
    await renameAttributeView(id, name)
    const { currentAV } = get()
    if (currentAV && currentAV.id === id) {
      set({ currentAV: { ...currentAV, name } })
    }
  },

  // 列操作
  createColumn: async (name: string, columnType: string, options?: string) => {
    const { currentAV } = get()
    if (!currentAV) return

    const id = generateId()
    await addAVColumn(id, currentAV.id, name, columnType, options)
    await get().loadAVDetail(currentAV.id)
  },

  updateColumn: async (id: string, updates: Partial<AVColumn>) => {
    const { currentAV } = get()
    if (!currentAV) return

    await updateAVColumn(id, {
      name: updates.name,
      columnType: updates.column_type,
      options: updates.options ? JSON.stringify(updates.options) : undefined,
      width: updates.width,
      hidden: updates.hidden,
      wrap: updates.wrap,
      icon: updates.icon,
    })
    await get().loadAVDetail(currentAV.id)
  },

  deleteColumn: async (id: string) => {
    const { currentAV } = get()
    if (!currentAV) return

    await deleteAVColumn(id)
    await get().loadAVDetail(currentAV.id)
  },

  // 行操作
  createRow: async (blockId: string) => {
    const { currentAV } = get()
    if (!currentAV) return

    const id = generateId()
    await addAVRow(id, currentAV.id, blockId)
    await get().loadAVDetail(currentAV.id)
  },

  deleteRow: async (id: string) => {
    const { currentAV } = get()
    if (!currentAV) return

    await deleteAVRow(id)
    await get().loadAVDetail(currentAV.id)
  },

  updateCell: async (rowId: string, columnId: string, value: any) => {
    const { currentAV } = get()
    if (!currentAV) return

    const id = generateId()
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value)
    await setAVCell(id, rowId, columnId, valueStr)
    await get().loadAVDetail(currentAV.id)
  },

  // 视图操作
  createView: async (name: string, viewType: 'table' | 'gallery' | 'kanban') => {
    const { currentAV } = get()
    if (!currentAV) return

    const id = generateId()
    await addAVView(id, currentAV.id, name, viewType)
    await get().loadAVDetail(currentAV.id)
  },

  updateView: async (id: string, updates: Partial<AVView>) => {
    const { currentAV } = get()
    if (!currentAV) return

    await updateAVView(id, {
      name: updates.name,
      viewType: updates.view_type,
      filters: updates.filters ? JSON.stringify(updates.filters) : undefined,
      sorts: updates.sorts ? JSON.stringify(updates.sorts) : undefined,
      groupBy: updates.group_by,
      pageSize: updates.page_size,
      icon: updates.icon,
    })
    await get().loadAVDetail(currentAV.id)
  },

  deleteView: async (id: string) => {
    const { currentAV } = get()
    if (!currentAV) return

    await deleteAVView(id)
    await get().loadAVDetail(currentAV.id)
  },

  setActiveView: (viewId: string) => {
    set({ activeViewId: viewId })
  },
}))

export default useAVStore
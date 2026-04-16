/**
 * 属性视图 Tauri 桥接
 */

import { invoke } from '@tauri-apps/api/core'

// 类型定义
export interface AttributeView {
  id: string
  name: string
  workspace_id: string
  created_at: number
  updated_at: number
}

export interface AVColumn {
  id: string
  av_id: string
  name: string
  column_type: ColumnType
  options?: SelectOption[]
  width: number
  hidden: boolean
  wrap: boolean
  icon?: string
  index: number
}

export interface AVView {
  id: string
  av_id: string
  name: string
  view_type: 'table' | 'gallery' | 'kanban'
  filters?: ViewFilter[]
  sorts?: ViewSort[]
  group_by?: string
  page_size: number
  icon?: string
  index: number
}

export interface AVRow {
  id: string
  av_id: string
  block_id: string
  created_at: number
  updated_at: number
}

export interface AVCell {
  id: string
  row_id: string
  column_id: string
  value: string
  updated_at: number
}

export interface SelectOption {
  id: string
  name: string
  color: string
}

export type ColumnType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multiSelect'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'relation'
  | 'rollup'
  | 'template'
  | 'asset'
  | 'created'
  | 'updated'

export interface ViewFilter {
  column_id: string
  operator: 'contains' | 'equals' | 'notEquals' | 'isEmpty' | 'isNotEmpty' | 'startsWith' | 'endsWith'
  value: string
}

export interface ViewSort {
  column_id: string
  order: 'asc' | 'desc'
}

export interface AVDetail {
  attributeView: AttributeView
  columns: AVColumn[]
  views: AVView[]
}

export interface AVTableData {
  columns: Array<{
    id: string
    name: string
    type: ColumnType
    options: SelectOption[]
  }>
  rows: Record<string, any>[]
}

// ==================== 工具函数 ====================

// 从 workspacePath 生成 workspaceId
function getWorkspaceId(workspacePath: string): string {
  // 使用简单的哈希将路径转换为 ID
  let hash = 0
  for (let i = 0; i < workspacePath.length; i++) {
    const char = workspacePath.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

// ==================== API ====================

// 创建属性视图
export async function createAttributeView(
  id: string,
  name: string,
  workspacePath: string
): Promise<AttributeView> {
  const workspaceId = getWorkspaceId(workspacePath)
  return await invoke('create_attribute_view', {
    id,
    name,
    workspaceId,
  })
}

// 获取工作区的所有属性视图
export async function getAttributeViews(
  workspacePath: string
): Promise<AttributeView[]> {
  const workspaceId = getWorkspaceId(workspacePath)
  return await invoke('get_attribute_views', { workspaceId })
}

// 获取属性视图详情
export async function getAttributeViewDetail(
  avId: string
): Promise<AVDetail> {
  return await invoke('get_attribute_view_detail', { avId })
}

// 添加列
export async function addAVColumn(
  id: string,
  avId: string,
  name: string,
  columnType: string,
  options?: string,
  icon?: string
): Promise<AVColumn> {
  return await invoke('add_av_column', {
    id,
    avId,
    name,
    columnType,
    options,
    icon,
  })
}

// 更新列
export async function updateAVColumn(
  id: string,
  options: {
    name?: string
    columnType?: string
    options?: string
    width?: number
    hidden?: boolean
    wrap?: boolean
    icon?: string
  }
): Promise<void> {
  return await invoke('update_av_column', {
    id,
    ...options,
  })
}

// 删除列
export async function deleteAVColumn(id: string): Promise<void> {
  return await invoke('delete_av_column', { id })
}

// 添加行
export async function addAVRow(
  id: string,
  avId: string,
  blockId: string
): Promise<AVRow> {
  return await invoke('add_av_row', { id, avId, blockId })
}

// 删除行
export async function deleteAVRow(id: string): Promise<void> {
  return await invoke('delete_av_row', { id })
}

// 获取行的单元格
export async function getAVRowCells(rowId: string): Promise<AVCell[]> {
  return await invoke('get_av_row_cells', { rowId })
}

// 获取视图的所有行数据
export async function getAVRows(avId: string): Promise<AVTableData> {
  return await invoke('get_av_rows', { avId })
}

// 设置单元格值
export async function setAVCell(
  id: string,
  rowId: string,
  columnId: string,
  value: string
): Promise<AVCell> {
  return await invoke('set_av_cell', { id, rowId, columnId, value })
}

// 删除属性视图
export async function deleteAttributeView(id: string): Promise<void> {
  return await invoke('delete_attribute_view', { id })
}

// 添加视图
export async function addAVView(
  id: string,
  avId: string,
  name: string,
  viewType: string,
  icon?: string
): Promise<AVView> {
  return await invoke('add_av_view', { id, avId, name, viewType, icon })
}

// 更新视图
export async function updateAVView(
  id: string,
  options: {
    name?: string
    viewType?: string
    filters?: string
    sorts?: string
    groupBy?: string
    pageSize?: number
    icon?: string
  }
): Promise<void> {
  return await invoke('update_av_view', {
    id,
    name: options.name,
    viewType: options.viewType,
    filters: options.filters,
    sorts: options.sorts,
    groupBy: options.groupBy,
    pageSize: options.pageSize,
    icon: options.icon,
  })
}

// 删除视图
export async function deleteAVView(id: string): Promise<void> {
  return await invoke('delete_av_view', { id })
}

// 重命名属性视图
export async function renameAttributeView(
  id: string,
  name: string
): Promise<void> {
  return await invoke('rename_attribute_view', { id, name })
}

// 生成唯一 ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// 颜色选项（用于 select/multiSelect）
export const COLUMN_COLORS = [
  { id: 'red', hex: '#ef4444' },
  { id: 'orange', hex: '#f97316' },
  { id: 'yellow', hex: '#eab308' },
  { id: 'green', hex: '#22c55e' },
  { id: 'blue', hex: '#3b82f6' },
  { id: 'purple', hex: '#a855f7' },
  { id: 'pink', hex: '#ec4899' },
  { id: 'gray', hex: '#6b7280' },
]

// 默认列类型
export const COLUMN_TYPE_DEFAULTS: Record<ColumnType, any> = {
  text: '',
  number: 0,
  date: null,
  select: null,
  multiSelect: [],
  checkbox: false,
  url: '',
  email: '',
  phone: '',
  relation: null,
  rollup: null,
  template: '',
  asset: null,
  created: Date.now(),
  updated: Date.now(),
}
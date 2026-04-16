'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useAVStore } from '@/lib/attribute-view'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  MoreHorizontal,
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  Filter,
  SortAsc,
  LayoutGrid,
  List,
  Kanban,
  MoreVertical,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 列类型选项
const COLUMN_TYPES = [
  { value: 'text', label: '文本', icon: '📝' },
  { value: 'number', label: '数字', icon: '🔢' },
  { value: 'date', label: '日期', icon: '📅' },
  { value: 'select', label: '单选', icon: '☑️' },
  { value: 'multiSelect', label: '多选', icon: '☑️☑️' },
  { value: 'checkbox', label: '复选框', icon: '✅' },
  { value: 'url', label: '链接', icon: '🔗' },
  { value: 'email', label: '邮箱', icon: '📧' },
  { value: 'phone', label: '电话', icon: '📞' },
]

// 视图类型
type ViewType = 'table' | 'gallery' | 'kanban'

// 列配置对话框
function ColumnConfigDialog({
  open,
  onOpenChange,
  onSave,
  editColumn,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, type: string, options?: any[]) => void
  editColumn?: { id: string; name: string; column_type: string; options?: any[] } | null
}) {
  const [name, setName] = useState('')
  const [columnType, setColumnType] = useState('text')
  const [options, setOptions] = useState<{ id: string; name: string; color: string }[]>([])
  const [newOption, setNewOption] = useState('')

  useEffect(() => {
    if (editColumn) {
      setName(editColumn.name)
      setColumnType(editColumn.column_type)
      setOptions(editColumn.options || [])
    } else {
      setName('')
      setColumnType('text')
      setOptions([])
    }
  }, [editColumn, open])

  const handleSave = () => {
    if (!name.trim()) return
    // Pass options array directly, will be stringified in the store
    const optionsArray = ['select', 'multiSelect'].includes(columnType)
      ? options
      : undefined
    onSave(name, columnType, optionsArray)
    onOpenChange(false)
  }

  const addOption = () => {
    if (!newOption.trim()) return
    const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray']
    setOptions([
      ...options,
      { id: `${Date.now()}`, name: newOption, color: colors[options.length % colors.length] },
    ])
    setNewOption('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editColumn ? '编辑列' : '添加列'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">列名称</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入列名称"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">列类型</label>
            <Select value={columnType} onValueChange={setColumnType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {['select', 'multiSelect'].includes(columnType) && (
            <div>
              <label className="text-sm font-medium">选项</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="添加选项"
                  onKeyDown={(e) => e.key === 'Enter' && addOption()}
                />
                <Button onClick={addOption} size="sm">
                  添加
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {options.map((opt) => (
                  <Badge
                    key={opt.id}
                    variant="outline"
                    className="cursor-pointer"
                    style={{ borderColor: opt.color, color: opt.color }}
                    onClick={() => setOptions(options.filter((o) => o.id !== opt.id))}
                  >
                    {opt.name} ×
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 单元格渲染组件
function CellRenderer({
  column,
  value,
  onChange,
}: {
  column: { id: string; name: string; column_type: string; options?: any[] }
  value: any
  onChange: (value: any) => void
}) {
  const [editValue, setEditValue] = useState(value)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleBlur = () => {
    setIsEditing(false)
    if (editValue !== value) {
      onChange(editValue)
    }
  }

  switch (column.column_type) {
    case 'checkbox':
      return (
        <Checkbox
          checked={editValue === true || editValue === 'true'}
          onCheckedChange={(checked) => {
            setEditValue(checked)
            onChange(checked)
          }}
        />
      )

    case 'select':
      return (
        <Select
          value={editValue || ''}
          onValueChange={(val) => {
            setEditValue(val)
            onChange(val)
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="选择..." />
          </SelectTrigger>
          <SelectContent>
            {column.options?.map((opt: any) => (
              <SelectItem key={opt.id} value={opt.name}>
                <Badge
                  variant="outline"
                  style={{ borderColor: opt.color, color: opt.color }}
                >
                  {opt.name}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'multiSelect':
      return (
        <div className="flex flex-wrap gap-1">
          {(editValue || []).map((val: string, idx: number) => {
            const opt = column.options?.find((o: any) => o.name === val)
            return (
              <Badge
                key={idx}
                variant="outline"
                style={{ borderColor: opt?.color, color: opt?.color }}
              >
                {val}
              </Badge>
            )
          })}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => setIsEditing(true)}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      )

    case 'number':
      return (
        <Input
          type="number"
          value={editValue || ''}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          className="h-8"
        />
      )

    case 'date':
      return (
        <Input
          type="date"
          value={editValue || ''}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          className="h-8"
        />
      )

    case 'url':
      return (
        <Input
          type="url"
          value={editValue || ''}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          className="h-8"
          placeholder="https://..."
        />
      )

    case 'email':
      return (
        <Input
          type="email"
          value={editValue || ''}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          className="h-8"
          placeholder="email@example.com"
        />
      )

    case 'phone':
      return (
        <Input
          type="tel"
          value={editValue || ''}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          className="h-8"
        />
      )

    default:
      return (
        <Input
          value={editValue || ''}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onFocus={() => setIsEditing(true)}
          className="h-8 border-0 bg-transparent focus:bg-background focus:ring-1 focus:ring-primary px-0"
        />
      )
  }
}

// 表格视图
function TableView({
  columns,
  rows,
  onCellChange,
  onRowDelete,
}: {
  columns: { id: string; name: string; column_type: string; options?: any[]; width: number }[]
  rows: Record<string, any>[]
  onCellChange: (rowId: string, columnId: string, value: any) => void
  onRowDelete: (rowId: string) => void
}) {
  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.id} style={{ width: col.width }}>
                {col.name}
              </TableHead>
            ))}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {columns.map((col) => (
                <TableCell key={col.id} className="py-1">
                  <CellRenderer
                    column={col}
                    value={row[col.name]}
                    onChange={(value) => onCellChange(row.id, col.id, value)}
                  />
                </TableCell>
              ))}
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRowDelete(row.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// 看板视图
function KanbanView({
  columns,
  rows,
  groupBy,
  onCellChange,
  onRowDelete,
}: {
  columns: { id: string; name: string; column_type: string; options?: any[] }[]
  rows: Record<string, any>[]
  groupBy: string
  onCellChange: (rowId: string, columnId: string, value: any) => void
  onRowDelete: (rowId: string) => void
}) {
  const groupColumn = columns.find((c) => c.id === groupBy || c.name === groupBy)
  const options = groupColumn?.options || []

  // 按分组
  const groups: Record<string, typeof rows> = { others: [] }
  options.forEach((opt: any) => {
    groups[opt.name] = []
  })

  rows.forEach((row) => {
    const value = row[groupBy || '']
    if (value && groups[value]) {
      groups[value].push(row)
    } else {
      groups.others.push(row)
    }
  })

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Object.entries(groups).map(([groupName, groupRows]) => (
        <div key={groupName} className="min-w-[280px] w-[280px]">
          <div className="font-medium text-sm mb-2 px-2 flex items-center gap-2">
            {groupColumn && groupName !== 'others' && (
              <Badge
                variant="outline"
                style={{
                  borderColor: options.find((o: any) => o.name === groupName)?.color,
                  color: options.find((o: any) => o.name === groupName)?.color,
                }}
              >
                {groupName}
              </Badge>
            )}
            {groupName === 'others' ? '未分类' : groupName}
            <Badge variant="secondary">{groupRows.length}</Badge>
          </div>
          <div className="space-y-2">
            {groupRows.map((row) => (
              <div
                key={row.id}
                className="bg-card border rounded-lg p-3 space-y-2"
              >
                {columns
                  .filter((c) => c.id !== groupBy && c.name !== groupBy)
                  .slice(0, 3)
                  .map((col) => (
                    <div key={col.id}>
                      <div className="text-xs text-muted-foreground">{col.name}</div>
                      <div className="text-sm">
                        {row[col.name]?.toString() || '-'}
                      </div>
                    </div>
                  ))}
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                    onClick={() => onRowDelete(row.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// 主组件
export function AttributeView({
  avId,
  onClose,
}: {
  avId: string
  onClose?: () => void
}) {
  const {
    currentAV,
    columns,
    views,
    tableData,
    activeViewId,
    loading,
    error,
    loadAVDetail,
    createColumn,
    updateColumn,
    deleteColumn,
    createRow,
    deleteRow,
    updateCell,
    createView,
    setActiveView,
  } = useAVStore()

  const [viewType, setViewType] = useState<ViewType>('table')
  const [columnDialogOpen, setColumnDialogOpen] = useState(false)
  const [editingColumn, setEditingColumn] = useState<any>(null)
  const [groupBy, setGroupBy] = useState<string>('')

  useEffect(() => {
    if (avId) {
      loadAVDetail(avId)
    }
  }, [avId])

  useEffect(() => {
    if (views.length > 0 && !activeViewId) {
      setActiveView(views[0].id)
    }
    const activeView = views.find((v) => v.id === activeViewId)
    if (activeView) {
      setViewType(activeView.view_type as ViewType)
    }
  }, [views, activeViewId])

  const handleAddColumn = async (name: string, columnType: string, options?: any[]) => {
    const optionsStr = options ? JSON.stringify(options) : undefined
    await createColumn(name, columnType, optionsStr)
  }

  const handleCellChange = async (rowId: string, columnId: string, value: any) => {
    await updateCell(rowId, columnId, value)
  }

  const handleAddRow = async () => {
    // 创建一个空的文档行
    await createRow(`temp-${Date.now()}`)
  }

  const handleAddView = async (type: ViewType) => {
    const viewNames: Record<ViewType, string> = {
      table: '表格视图',
      gallery: '画廊视图',
      kanban: '看板视图',
    }
    await createView(viewNames[type], type)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        加载失败: {error}
      </div>
    )
  }

  const rows = tableData?.rows || []
  const tableColumns: Array<{
    id: string
    name: string
    column_type: string
    options?: any[]
    width: number
  }> = (tableData?.columns || []).map((col) => ({
    id: col.id,
    name: col.name,
    column_type: col.type,
    options: col.options,
    width: 200,
  }))

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{currentAV?.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* 视图类型切换 */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewType === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewType('table')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewType === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewType('kanban')}
            >
              <Kanban className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddRow}>
            <Plus className="w-4 h-4 mr-1" />
            添加行
          </Button>
          <Button variant="outline" size="sm" onClick={() => setColumnDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            添加列
          </Button>
        </div>
      </div>

      {/* 看板布局：分组选择 */}
      {viewType === 'kanban' && (
        <div className="px-4 py-2 border-b flex items-center gap-2">
          <span className="text-sm text-muted-foreground">分组:</span>
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="选择分组列" />
            </SelectTrigger>
            <SelectContent>
              {tableColumns
                .filter((c) => ['select'].includes(c.column_type))
                .map((col) => (
                  <SelectItem key={col.id} value={col.name}>
                    {col.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto">
        {viewType === 'table' ? (
          <TableView
            columns={tableColumns}
            rows={rows}
            onCellChange={handleCellChange}
            onRowDelete={deleteRow}
          />
        ) : viewType === 'kanban' ? (
          <KanbanView
            columns={tableColumns}
            rows={rows}
            groupBy={groupBy}
            onCellChange={handleCellChange}
            onRowDelete={deleteRow}
          />
        ) : null}
      </div>

      {/* 列配置对话框 */}
      <ColumnConfigDialog
        open={columnDialogOpen}
        onOpenChange={setColumnDialogOpen}
        onSave={handleAddColumn}
        editColumn={editingColumn}
      />
    </div>
  )
}

export default AttributeView
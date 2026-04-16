'use client'

import React, { useState, useEffect } from 'react'
import { useAVStore } from '@/lib/attribute-view'
import { getAttributeViews } from '@/lib/attribute-view/tauri'
import useSettingStore from '@/stores/setting'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Database, Trash2, Edit2, Table, Kanban, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AVManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectAV: (avId: string) => void
}

export function AVManager({ open, onOpenChange, onSelectAV }: AVManagerProps) {
  const [avs, setAVs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newAVName, setNewAVName] = useState('')
  const workspacePath = useSettingStore((state) => state.workspacePath)

  const { createAV, deleteAV } = useAVStore()

  useEffect(() => {
    if (open && workspacePath) {
      loadAVs()
    }
  }, [open, workspacePath])

  const loadAVs = async () => {
    if (!workspacePath) return
    setLoading(true)
    try {
      const list = await getAttributeViews(workspacePath)
      setAVs(list)
    } catch (error) {
      console.error('Failed to load AVs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newAVName.trim()) return
    try {
      const av = await createAV(newAVName)
      setAVs([...avs, av])
      setNewAVName('')
      setCreateDialogOpen(false)
      // 选中新创建的 AV
      onSelectAV(av.id)
    } catch (error) {
      console.error('Failed to create AV:', error)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('确定要删除这个属性视图吗？')) return
    try {
      await deleteAV(id)
      setAVs(avs.filter((av) => av.id !== id))
    } catch (error) {
      console.error('Failed to delete AV:', error)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              属性视图
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                加载中...
              </div>
            ) : avs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">暂无属性视图</p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  创建属性视图
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {avs.map((av) => (
                    <div
                      key={av.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => {
                        onSelectAV(av.id)
                        onOpenChange(false)
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Database className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{av.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(av.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(av.id, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新建属性视图
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建属性视图</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newAVName}
              onChange={(e) => setNewAVName(e.target.value)}
              placeholder="输入属性视图名称"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={!newAVName.trim()}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AVManager
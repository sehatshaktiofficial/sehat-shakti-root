// Offline Sync Service - Handles data synchronization when internet is available
import { database } from '../database'
import { Q } from '@nozbe/watermelondb'
import { useAppStore } from '../store/AppStore'

interface SyncItem {
  id: string
  tableName: string
  recordId: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  dataPayload: any
  priority: number
  retryCount: number
  maxRetries: number
  scheduledAt?: Date
  estimatedBandwidth?: number
  dependencies?: string[]
}

interface SyncStatus {
  isPending: boolean
  lastSync: number
  failedOperations: number
  totalPending: number
  syncProgress: number
}

class OfflineSyncService {
  private isOnline: boolean = false
  private syncInProgress: boolean = false
  private syncQueue: SyncItem[] = []
  private syncInterval: NodeJS.Timeout | null = null
  private retryDelay: number = 5000 // 5 seconds
  private maxRetryDelay: number = 300000 // 5 minutes

  constructor() {
    this.startSyncMonitoring()
  }

  // Initialize sync service
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Offline Sync Service...')
      
      // Load pending sync items from database
      await this.loadSyncQueue()
      
      // Check online status
      this.isOnline = await this.checkOnlineStatus()
      
      // Start sync if online
      if (this.isOnline) {
        await this.startSync()
      }
      
      console.log('Offline Sync Service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Offline Sync Service:', error)
    }
  }

  // Check if device is online
  private async checkOnlineStatus(): Promise<boolean> {
    try {
      // Simple connectivity test
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      })
      return true
    } catch (error) {
      return false
    }
  }

  // Load sync queue from database
  private async loadSyncQueue(): Promise<void> {
    try {
      const syncItems = await database.collections
        .get('sync_queue')
        .query(
          Q.sortBy('priority', Q.asc),
          Q.sortBy('created_at', Q.asc)
        )
        .fetch()

      this.syncQueue = syncItems.map(item => ({
        id: item.id,
        tableName: (item as any).tableName,
        recordId: (item as any).recordId,
        operation: (item as any).operation,
        dataPayload: (item as any).dataPayload,
        priority: (item as any).priority,
        retryCount: (item as any).retryCount,
        maxRetries: (item as any).maxRetries,
        scheduledAt: (item as any).scheduledAt ? new Date((item as any).scheduledAt) : undefined,
        estimatedBandwidth: (item as any).estimatedBandwidth,
        dependencies: (item as any).dependencies || [],
      }))

      console.log(`Loaded ${this.syncQueue.length} items from sync queue`)
    } catch (error) {
      console.error('Error loading sync queue:', error)
    }
  }

  // Add item to sync queue
  async addToSyncQueue(
    tableName: string,
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    dataPayload: any,
    priority: number = 3,
    dependencies?: string[]
  ): Promise<void> {
    try {
      const syncItem: SyncItem = {
        id: Date.now().toString(),
        tableName,
        recordId,
        operation,
        dataPayload,
        priority,
        retryCount: 0,
        maxRetries: 3,
        estimatedBandwidth: this.estimateBandwidth(dataPayload),
        dependencies: dependencies || [],
      }

      // Save to database
      await database.write(async () => {
        await database.collections.get('sync_queue').create((record: any) => {
          Object.assign(record, syncItem)
        })
      })

      // Add to memory queue
      this.syncQueue.push(syncItem)
      this.syncQueue.sort((a, b) => a.priority - b.priority)

      console.log(`Added item to sync queue: ${tableName}.${recordId}`)

      // Start sync if online
      if (this.isOnline && !this.syncInProgress) {
        await this.startSync()
      }
    } catch (error) {
      console.error('Error adding item to sync queue:', error)
    }
  }

  // Estimate bandwidth for sync item
  private estimateBandwidth(dataPayload: any): number {
    try {
      const jsonString = JSON.stringify(dataPayload)
      return jsonString.length * 2 // Rough estimate in bytes
    } catch (error) {
      return 1024 // Default 1KB
    }
  }

  // Start sync process
  async startSync(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return
    }

    try {
      this.syncInProgress = true
      console.log('Starting sync process...')

      const { setSyncState } = useAppStore.getState()
      setSyncState({ isPending: true, lastSync: Date.now(), failedOperations: 0 })

      let successCount = 0
      let failCount = 0

      for (const item of this.syncQueue) {
        try {
          // Check dependencies
          if (item.dependencies && item.dependencies.length > 0) {
            const dependenciesMet = await this.checkDependencies(item.dependencies)
            if (!dependenciesMet) {
              console.log(`Dependencies not met for ${item.id}, skipping...`)
              continue
            }
          }

          // Check if item is scheduled for later
          if (item.scheduledAt && item.scheduledAt > new Date()) {
            console.log(`Item ${item.id} scheduled for later, skipping...`)
            continue
          }

          // Perform sync operation
          const success = await this.syncItem(item)
          
          if (success) {
            successCount++
            await this.removeFromSyncQueue(item.id)
          } else {
            failCount++
            await this.handleSyncFailure(item)
          }

          // Update progress
          const progress = ((successCount + failCount) / this.syncQueue.length) * 100
          setSyncState({ 
            isPending: true, 
            lastSync: Date.now(), 
            failedOperations: failCount,
            totalPending: this.syncQueue.length - successCount - failCount,
            syncProgress: progress
          })

        } catch (error) {
          console.error(`Error syncing item ${item.id}:`, error)
          failCount++
          await this.handleSyncFailure(item)
        }
      }

      // Update final status
      setSyncState({ 
        isPending: false, 
        lastSync: Date.now(), 
        failedOperations: failCount,
        totalPending: this.syncQueue.length,
        syncProgress: 100
      })

      console.log(`Sync completed: ${successCount} success, ${failCount} failed`)

    } catch (error) {
      console.error('Error during sync process:', error)
      const { setSyncState } = useAppStore.getState()
      setSyncState({ isPending: false, lastSync: Date.now(), failedOperations: 0 })
    } finally {
      this.syncInProgress = false
    }
  }

  // Sync individual item
  private async syncItem(item: SyncItem): Promise<boolean> {
    try {
      // Simulate API call based on operation type
      switch (item.operation) {
        case 'INSERT':
          return await this.syncInsert(item)
        case 'UPDATE':
          return await this.syncUpdate(item)
        case 'DELETE':
          return await this.syncDelete(item)
        default:
          console.error(`Unknown operation: ${item.operation}`)
          return false
      }
    } catch (error) {
      console.error(`Error syncing item ${item.id}:`, error)
      return false
    }
  }

  // Sync INSERT operation
  private async syncInsert(item: SyncItem): Promise<boolean> {
    try {
      // In a real implementation, this would make an API call
      console.log(`Syncing INSERT: ${item.tableName}.${item.recordId}`)
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Simulate success/failure based on retry count
      return item.retryCount < 2 || Math.random() > 0.3
    } catch (error) {
      console.error('Error in syncInsert:', error)
      return false
    }
  }

  // Sync UPDATE operation
  private async syncUpdate(item: SyncItem): Promise<boolean> {
    try {
      console.log(`Syncing UPDATE: ${item.tableName}.${item.recordId}`)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return item.retryCount < 2 || Math.random() > 0.2
    } catch (error) {
      console.error('Error in syncUpdate:', error)
      return false
    }
  }

  // Sync DELETE operation
  private async syncDelete(item: SyncItem): Promise<boolean> {
    try {
      console.log(`Syncing DELETE: ${item.tableName}.${item.recordId}`)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return item.retryCount < 2 || Math.random() > 0.1
    } catch (error) {
      console.error('Error in syncDelete:', error)
      return false
    }
  }

  // Check if dependencies are met
  private async checkDependencies(dependencies: string[]): Promise<boolean> {
    try {
      for (const depId of dependencies) {
        const exists = this.syncQueue.find(item => item.id === depId)
        if (exists) {
          return false // Dependency still in queue
        }
      }
      return true
    } catch (error) {
      console.error('Error checking dependencies:', error)
      return false
    }
  }

  // Handle sync failure
  private async handleSyncFailure(item: SyncItem): Promise<void> {
    try {
      const newRetryCount = item.retryCount + 1
      
      if (newRetryCount >= item.maxRetries) {
        // Max retries reached, remove from queue
        console.log(`Max retries reached for ${item.id}, removing from queue`)
        await this.removeFromSyncQueue(item.id)
        return
      }

      // Update retry count and schedule retry
      const retryDelay = Math.min(
        this.retryDelay * Math.pow(2, newRetryCount - 1),
        this.maxRetryDelay
      )
      
      const scheduledAt = new Date(Date.now() + retryDelay)

      await database.write(async () => {
        const syncRecord = await database.collections.get('sync_queue').find(item.id)
        await syncRecord.update((record: any) => {
          record.retryCount = newRetryCount
          record.scheduledAt = scheduledAt.getTime()
        })
      })

      // Update in memory queue
      const queueIndex = this.syncQueue.findIndex(q => q.id === item.id)
      if (queueIndex !== -1) {
        this.syncQueue[queueIndex].retryCount = newRetryCount
        this.syncQueue[queueIndex].scheduledAt = scheduledAt
      }

      console.log(`Scheduled retry for ${item.id} in ${retryDelay}ms`)

    } catch (error) {
      console.error('Error handling sync failure:', error)
    }
  }

  // Remove item from sync queue
  private async removeFromSyncQueue(itemId: string): Promise<void> {
    try {
      // Remove from database
      const syncRecord = await database.collections.get('sync_queue').find(itemId)
      await database.write(async () => {
        await syncRecord.destroyPermanently()
      })

      // Remove from memory queue
      this.syncQueue = this.syncQueue.filter(item => item.id !== itemId)

      console.log(`Removed ${itemId} from sync queue`)

    } catch (error) {
      console.error('Error removing item from sync queue:', error)
    }
  }

  // Start sync monitoring
  private startSyncMonitoring(): void {
    this.syncInterval = setInterval(async () => {
      const wasOnline = this.isOnline
      this.isOnline = await this.checkOnlineStatus()

      if (!wasOnline && this.isOnline) {
        console.log('Connection restored, starting sync...')
        await this.startSync()
      } else if (wasOnline && !this.isOnline) {
        console.log('Connection lost, stopping sync...')
        this.syncInProgress = false
      }
    }, 30000) // Check every 30 seconds
  }

  // Get sync status
  getSyncStatus(): SyncStatus {
    return {
      isPending: this.syncInProgress,
      lastSync: useAppStore.getState().syncState.lastSync,
      failedOperations: useAppStore.getState().syncState.failedOperations,
      totalPending: this.syncQueue.length,
      syncProgress: useAppStore.getState().syncState.syncProgress || 0,
    }
  }

  // Force sync
  async forceSync(): Promise<void> {
    if (this.isOnline) {
      await this.startSync()
    } else {
      console.log('Cannot force sync: device is offline')
    }
  }

  // Clear sync queue (for testing)
  async clearSyncQueue(): Promise<void> {
    try {
      await database.write(async () => {
        const syncRecords = await database.collections.get('sync_queue').query().fetch()
        await Promise.all(syncRecords.map(record => record.destroyPermanently()))
      })
      
      this.syncQueue = []
      console.log('Sync queue cleared')
    } catch (error) {
      console.error('Error clearing sync queue:', error)
    }
  }

  // Cleanup
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }
}

// Singleton instance
export const offlineSyncService = new OfflineSyncService()

// Export for easy access
export const useOfflineSync = () => {
  const syncState = useAppStore((state) => state.syncState)
  
  return {
    syncState,
    addToSyncQueue: offlineSyncService.addToSyncQueue.bind(offlineSyncService),
    forceSync: offlineSyncService.forceSync.bind(offlineSyncService),
    getSyncStatus: offlineSyncService.getSyncStatus.bind(offlineSyncService),
    clearSyncQueue: offlineSyncService.clearSyncQueue.bind(offlineSyncService),
  }
}

export default offlineSyncService

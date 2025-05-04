/**
 * A simple queue implementation to process tasks sequentially
 */

type QueueTask = () => Promise<void>;

export class TaskQueue {
  private queue: QueueTask[] = [];
  private isProcessing = false;

  /**
   * Add a task to the queue
   * @param task The task to add to the queue
   */
  public enqueue(task: QueueTask): void {
    this.queue.push(task);
    this.processQueue();
  }

  /**
   * Process the next task in the queue if not already processing
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const nextTask = this.queue.shift();
      if (nextTask) {
        await nextTask();
      }
    } catch (error) {
      console.error("Error processing queue task:", error);
    } finally {
      this.isProcessing = false;
      // Process the next task if there are any
      if (this.queue.length > 0) {
        await this.processQueue();
      }
    }
  }

  /**
   * Get the current queue length
   */
  public get length(): number {
    return this.queue.length;
  }

  /**
   * Check if the queue is currently processing a task
   */
  public get busy(): boolean {
    return this.isProcessing;
  }
}

// Create a singleton instance to be used throughout the application
export const taskQueue = new TaskQueue();

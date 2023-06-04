export class Timer {
  private base: Date;
  private last: Date;

  private constructor(base: Date) {
    this.base = base;
    this.last = base;
  }

  public static start() {
    return new Timer(new Date(Date.now()));
  }

  /**
   * Stores the latest runtime.
   * Returns a pretty formatted time.
   */
  public time(): string {
    const now = new Date(Date.now());
    return this.timeAt(now);
  }

  /**
   * Stores the runtime between start and the given timestamp.
   * Returns a pretty formatted time at the given timestamp.
   */
  public timeAt(at: Date): string {
    const sinceBase = (at.getTime() - this.base.getTime()) / 1000; // seconds
    const sinceLast = (at.getTime() - this.last.getTime()) / 1000; // seconds
    this.last = at;
    const sign = sinceLast >= 0 ? "+" : "";
    return `${sinceBase.toFixed(1)}s (${sign}${sinceLast.toFixed(1)}s)`;
  }

  /**
   * Returns the time in seconds from start until the last time taken
   */
  public lastTime(): number {
    return (this.last.getTime() - this.base.getTime()) / 1000;
  }
}

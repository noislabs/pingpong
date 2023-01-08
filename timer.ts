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

  public time(): string {
    const now = new Date(Date.now());
    return this.timeAt(now);
  }

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
  public final(): number {
    return (this.last.getTime() - this.base.getTime()) / 1000;
  }
}

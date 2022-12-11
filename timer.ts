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
    const sinceBase = at.getTime() - this.base.getTime();
    const sinceLast = at.getTime() - this.last.getTime();
    this.last = at;
    return `${(sinceBase / 1000).toFixed(1)}s (+${(sinceLast / 1000).toFixed(1)}s)`;
  }
}

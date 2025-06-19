import * as util from 'util';

export class Logger {
  private readonly section: string;

  private colors = {
    red: (text: string) => `\x1b[31m${text}\x1b[0m`,
    green: (text: string) => `\x1b[32m${text}\x1b[0m`,
    blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  };

  constructor(section: string) {
    this.section = section;
  }

  public log(...args: any[]): void {
    console.log(...args);
  }

  public info(...args: any[]): void {
    console.info(this.colors.green('INFO:'), ...args);
  }

  public error(...args: any[]): void {
    console.error(this.colors.red('ERROR:'), ...args);
  }

  public debug(...args: any[]): void {
    if (['*', 'jstunnel', this.section].includes(process.env.DEBUG)) {
      console.debug(new Date(), this.colors.blue(this.section), ...args);
    }
  }

  public inspect(obj: Record<any, any> | string): void {
    console.log(util.inspect(obj, { showHidden: false, depth: null, colors: true }));
  }
}

function executeIfNotNull(fn?: () => void) {
  if (fn) {
    fn();
  }
}

const QUEUE_BUFFER_SIZE = 32 * 1024;

export class AsyncQueue {
  private _promises: Promise<void>[] = [];
  private _resolvers: (() => void)[] = [];

  private _buffer = new Uint8Array(QUEUE_BUFFER_SIZE);
  private _head = 0;
  private _tail = 0;

  close() {
    this._promises = [];
    this._resolvers = [];

    this._buffer = new Uint8Array(QUEUE_BUFFER_SIZE);
    this._head = 0;
    this._tail = 0;
  }

  private _add() {
    this._promises.push(
      new Promise((resolve) => {
        this._resolvers.push(resolve);
      })
    );
  }

  push(v: number) {
    const next = (this._head + 1) % QUEUE_BUFFER_SIZE;
    if (next == this._tail) {
      throw new Error("queue full");
    }

    this._buffer[next] = v;
    this._head = next;

    if (this._resolvers.length) {
      executeIfNotNull(this._resolvers.shift());
    }
  }

  pop(): Promise<number> {
    return Promise.resolve().then(() => {
      if (this._head != this._tail) {
        this._tail = (this._tail + 1) % QUEUE_BUFFER_SIZE;
        return this._buffer[this._tail];
      }
      if (!this._promises.length) {
        this._add();
      }

      return (this._promises.shift() || Promise.resolve()).then(() =>
        this.pop()
      );
    });
  }

  write(array: Uint8Array) {
    for (const v of array) {
      this.push(v);
    }
  }

  async read(size: number): Promise<number[]> {
    const buffer: number[] = [];
    for (let i = 0; i < size; i++) {
      buffer.push(await this.pop());
    }
    return buffer;
  }
}

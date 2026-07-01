import WebSocket from 'ws';

export class CDPConnection {
  private ws: WebSocket | null = null;
  private callbacks = new Map<number, (result: any) => void>();
  private nextId = 1;
  private pendingCommands: Array<{ method: string; params?: any; resolve: (v: any) => void; reject: (e: Error) => void }> = [];

  constructor(private webSocketUrl: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.webSocketUrl);

      this.ws.on('open', () => {
        // Flush pending commands
        for (const cmd of this.pendingCommands) {
          this.sendCommandInternal(cmd.method, cmd.params).then(cmd.resolve).catch(cmd.reject);
        }
        this.pendingCommands = [];
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.id && this.callbacks.has(msg.id)) {
            const cb = this.callbacks.get(msg.id)!;
            this.callbacks.delete(msg.id);
            if (msg.error) {
              // Store error on the callback's result for caller to handle
              cb({ error: msg.error });
            } else {
              cb(msg.result);
            }
          }
        } catch {
          // ignore parse errors
        }
      });

      this.ws.on('error', (err) => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          reject(err);
        }
      });

      this.ws.on('close', () => {
        // Reject pending callbacks
        for (const [id, cb] of this.callbacks) {
          cb({ error: { message: 'Connection closed' } });
        }
        this.callbacks.clear();
      });
    });
  }

  private sendCommandInternal(method: string, params?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'));
        return;
      }

      const id = this.nextId++;
      this.callbacks.set(id, resolve);

      const message = JSON.stringify({ id, method, params });
      this.ws.send(message);

      // Timeout after 10s
      setTimeout(() => {
        if (this.callbacks.has(id)) {
          this.callbacks.delete(id);
          reject(new Error(`Command ${method} timed out`));
        }
      }, 10000);
    });
  }

  async send(method: string, params?: any): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Queue for reconnection
      return new Promise((resolve, reject) => {
        this.pendingCommands.push({ method, params, resolve, reject });
      });
    }
    return this.sendCommandInternal(method, params);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

import Gun from 'gun';
import 'gun/sea';
import 'gun/lib/then';
import 'gun/lib/webrtc';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed';

// Simple types for collaboration features
export interface UserPresence {
  userId: string;
  userName: string;
  color: string;
  lastSeen: number;
  modelId: string;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  timestamp: number;
}

class GunService {
  private gun: any;

  constructor() {
    // This is the only URL logic you need now.
    // It builds the relay URL from the current page's origin.
    // - In Dev: "http://localhost:5173/gun" (which Vite will proxy)
    // - In Prod: "https://your-app.com/gun" (which your server will route)
    const relayUrl = `${window.location.origin}/gun`;

    this.gun = Gun({
      peers: [relayUrl],
      rtc: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun.services.mozilla.com' },
        ],
      },
      localStorage: true,
      radisk: true,
    });

    console.log(`GUN initialized with relay: ${relayUrl}`);
  }

  /**
   * Gets the root graph for a specific model.
   */
  getModel(modelId: string) {
    if (!modelId) {
      throw new Error('Model ID cannot be null or empty.');
    }
    return this.gun.get(`event-model-weaver/${modelId}`);
  }

  /**
   * Update user presence - shows who is viewing the model
   */
  updatePresence(
    modelId: string,
    userId: string,
    userName: string,
    color: string
  ) {
    const presenceRef = this.gun.get(`presence/${modelId}/${userId}`);
    presenceRef.put(
      {
        userId,
        userName,
        color,
        modelId,
        lastSeen: Date.now(),
      },
      (ack: any) => {
        if (ack.err) {
          console.error('Failed to update presence:', ack.err);
        }
      }
    );
  }

  /**
   * Subscribe to presence updates - get notified when users join/leave
   */
  subscribeToPresence(
    modelId: string,
    callback: (users: Record<string, UserPresence>) => void
  ): () => void {
    const presenceRef = this.gun.get(`presence/${modelId}`);
    const users: Record<string, UserPresence> = {};

    presenceRef.map().on((userData: any, userId: string) => {
      if (userData && userData.lastSeen && !userData._deleted) {
        // Filter out users who haven't been seen in 30 seconds
        if (Date.now() - userData.lastSeen < 30000) {
          users[userId] = userData;
        } else {
          delete users[userId];
        }
        callback({ ...users });
      } else if (userData && userData._deleted) {
        // Remove deleted users
        delete users[userId];
        callback({ ...users });
      }
    });

    // Return cleanup function
    return () => {
      presenceRef.map().off();
    };
  }

  /**
   * Update cursor position
   */
  updateCursor(modelId: string, userId: string, x: number, y: number) {
    const cursorRef = this.gun.get(`cursors/${modelId}/${userId}`);
    cursorRef.put(
      {
        userId,
        x,
        y,
        timestamp: Date.now(),
      },
      (ack: any) => {
        if (ack.err) {
          console.error('Failed to update cursor:', ack.err);
        }
      }
    );
  }

  /**
   * Subscribe to cursor updates
   */
  subscribeToCursors(
    modelId: string,
    callback: (cursors: Record<string, CursorPosition>) => void
  ): () => void {
    const cursorsRef = this.gun.get(`cursors/${modelId}`);
    const cursors: Record<string, CursorPosition> = {};

    cursorsRef.map().on((cursorData: any, userId: string) => {
      if (cursorData && cursorData.timestamp && !cursorData._deleted) {
        // Filter out stale cursors (older than 5 seconds)
        if (Date.now() - cursorData.timestamp < 5000) {
          cursors[userId] = cursorData;
        } else {
          delete cursors[userId];
        }
        callback({ ...cursors });
      } else if (cursorData && cursorData._deleted) {
        // Remove deleted cursors
        delete cursors[userId];
        callback({ ...cursors });
      }
    });

    return () => {
      cursorsRef.map().off();
    };
  }

  /**
   * Remove user presence (call when user leaves)
   */
  removePresence(modelId: string, userId: string) {
    const presenceRef = this.gun.get(`presence/${modelId}/${userId}`);
    // Set to an empty object with a special _deleted flag instead of null
    presenceRef.put({ _deleted: true, lastSeen: 0 }, (ack: any) => {
      if (ack.err) {
        console.error('Failed to remove presence:', ack.err);
      }
    });
  }

  /**
   * Remove cursor (call when user leaves)
   */
  removeCursor(modelId: string, userId: string) {
    const cursorRef = this.gun.get(`cursors/${modelId}/${userId}`);
    // Set to an empty object with a special _deleted flag instead of null
    cursorRef.put({ _deleted: true, timestamp: 0 }, (ack: any) => {
      if (ack.err) {
        console.error('Failed to remove cursor:', ack.err);
      }
    });
  }
}

const gunService = new GunService();
export default gunService;
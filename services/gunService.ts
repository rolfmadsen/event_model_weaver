import Gun from 'gun/gun';
import 'gun/sea.js';
import 'gun/lib/then';
import 'gun/lib/webrtc';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed';
import 'gun/nts';


// Type definition for GUN instance is notoriously tricky; using 'any' is common practice.
class GunService {
  private gun: any;

  constructor() {
    // Initialize GUN and connect to a more robust set of public relay peers.
    // These peers help browsers find each other but do not store our data.
    this.gun = Gun({
      peers: [
        // Community-run relay peers. Public peers can be unstable.
        'https://relay.gun-js.de/gun',
        'https://relay.peer.ooo/gun',
        'https://peer.evan.biz/gun',
        'https://gun-server.fly.dev/gun',
        'https://gundb-server-webrtc-2.glitch.me/gun'
      ],
      // Explicitly provide STUN servers for WebRTC to improve P2P connection reliability through NATs/firewalls.
      rtc: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun.services.mozilla.com' },
        ],
      },
    });
  }

  /**
   * Gets the root graph for a specific model.
   * All nodes and links for a model will be stored under this graph.
   * @param modelId The unique ID of the model.
   * @returns A GUN graph reference for the model.
   */
  getModel(modelId: string) {
    if (!modelId) {
      throw new Error("Model ID cannot be null or empty.");
    }
    return this.gun.get(`event-model-weaver/${modelId}`);
  }
}

// Export a singleton instance.
const gunService = new GunService();
export default gunService;
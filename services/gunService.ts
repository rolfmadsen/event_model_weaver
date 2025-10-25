
// FIX: Removed `import Gun from 'gun';` which was conflicting with the global 'Gun' declaration below.
// The comment indicates Gun.js is loaded via a script tag, making the import unnecessary and erroneous.

// Type definition for GUN instance is notoriously tricky; using 'any' is common practice.
// We are using the global Gun object from the script tag in index.html.
declare const Gun: any;

class GunService {
  private gun: any;

  constructor() {
    // Initialize GUN and connect to public relay peers.
    // These peers help browsers find each other but do not store our data.
    this.gun = Gun({
      peers: [
        'https://gun-manhattan.herokuapp.com/gun',
        'https://peer.wallie.io/gun'
      ]
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

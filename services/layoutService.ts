import { Node, Slice, ElementType, Link } from '../types';
import { MIN_NODE_HEIGHT, NODE_WIDTH } from '../constants';

const LANE_PADDING = 80;
const LANE_WIDTH = NODE_WIDTH + 60;
const NODE_VERTICAL_SPACING = 50;
const TOP_MARGIN = 100;

const TYPE_ORDER: Record<ElementType, number> = {
    [ElementType.Trigger]: 0,
    [ElementType.Command]: 1,
    [ElementType.Aggregate]: 2,
    [ElementType.Event]: 3,
    [ElementType.View]: 4,
    [ElementType.Policy]: 4, // Same level as View
};


class LayoutService {
    public calculateSwimlaneLayout(
        slices: Slice[],
        nodes: Node[],
        links: Link[],
        canvasWidth: number
    ): Map<string, { x: number; y: number }> {
        const positions = new Map<string, { x: number; y: number }>();
        const nodesMap = new Map(nodes.map(n => [n.id, n]));
        
        // A simple topological sort could be used here for more advanced ordering
        const orderedSlices = slices; // For now, use the found order

        const totalWidth = orderedSlices.length * LANE_WIDTH + (orderedSlices.length - 1) * LANE_PADDING;
        const startX = (canvasWidth - totalWidth) / 2;
        
        orderedSlices.forEach((slice, i) => {
            const laneCenterX = startX + i * (LANE_WIDTH + LANE_PADDING) + LANE_WIDTH / 2;
            const sliceNodes = Array.from(slice.nodeIds).map(id => nodesMap.get(id)!);

            // Simple sorting within the lane based on type and connections
            const sortedSliceNodes = this.sortNodesWithinSlice(sliceNodes, links);
            
            let currentY = TOP_MARGIN;
            
            sortedSliceNodes.forEach(node => {
                // The computedHeight is not available here, so we use an approximation
                const nodeHeight = MIN_NODE_HEIGHT + (node.name.length / 15) * 20;
                positions.set(node.id, { x: laneCenterX, y: currentY + nodeHeight / 2 });
                currentY += nodeHeight + NODE_VERTICAL_SPACING;
            });
        });

        return positions;
    }

    private sortNodesWithinSlice(nodes: Node[], allLinks: Link[]): Node[] {
        // Create a simple graph for sorting
        const nodesMap = new Map(nodes.map(n => [n.id, n]));
        const inDegree = new Map<string, number>(nodes.map(n => [n.id, 0]));
        const adj = new Map<string, string[]>(nodes.map(n => [n.id, []]));

        allLinks.forEach(link => {
            if (nodesMap.has(link.source) && nodesMap.has(link.target)) {
                adj.get(link.source)?.push(link.target);
                inDegree.set(link.target, (inDegree.get(link.target) || 0) + 1);
            }
        });
        
        // Start with nodes that have no incoming connections *within the slice*
        const queue = nodes.filter(n => (inDegree.get(n.id) || 0) === 0);
        
        // Fallback to type-based sorting if topological sort fails (e.g., cycles or disconnected)
        if (queue.length === 0 && nodes.length > 0) {
            return [...nodes].sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
        }

        const result: Node[] = [];
        while (queue.length > 0) {
            const u = queue.shift()!;
            // FIX: 'u' is already the Node object, so push it directly.
            result.push(u);
            // FIX: 'adj' map is keyed by node ID (string), not the Node object.
            adj.get(u.id)?.forEach(v => {
                inDegree.set(v, inDegree.get(v)! - 1);
                if (inDegree.get(v) === 0) {
                    // FIX: 'queue' expects Node objects, but 'v' is a node ID (string). Look up the node in the map.
                    queue.push(nodesMap.get(v)!);
                }
            });
        }
        
        // Add any remaining nodes (e.g. from cycles)
        if (result.length !== nodes.length) {
            nodes.forEach(n => {
                if (!result.find(res => res.id === n.id)) {
                    result.push(n);
                }
            });
        }

        return result;
    }
}

const layoutService = new LayoutService();
export default layoutService;
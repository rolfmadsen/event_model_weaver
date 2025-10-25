import { Node, Link, ElementType, Slice } from '../types';
import { v4 as uuidv4 } from 'uuid';
import validationService from './validationService';

const SLICE_COLORS = [
    'rgba(59, 130, 246, 0.1)',
    'rgba(249, 115, 22, 0.1)',
    'rgba(34, 197, 94, 0.1)',
    'rgba(168, 85, 247, 0.1)',
    'rgba(239, 68, 68, 0.1)',
    'rgba(234, 179, 8, 0.1)',
];

class SliceService {
    public calculateSlices(nodes: Node[], links: Link[]): { slices: Slice[], nodeSliceMap: Map<string, string> } {
        const nodeSliceMap = new Map<string, string>();
        const slices: Slice[] = [];
        const linksFromNode = new Map<string, Link[]>(nodes.map(n => [n.id, []]));
        const linksToNode = new Map<string, Link[]>(nodes.map(n => [n.id, []]));
        links.forEach(link => {
            linksFromNode.get(link.source)?.push(link);
            linksToNode.get(link.target)?.push(link);
        });
        const nodesMap = new Map(nodes.map(n => [n.id, n]));

        const startNodes: Node[] = nodes.filter(node => {
            // Rule 1: Any Trigger is a start
            if (node.type === ElementType.Trigger) return true;
            
            // Rule 2 & 3: A Command is a start if...
            if (node.type === ElementType.Command) {
                const incomingLinks = linksToNode.get(node.id) ?? [];
                // It has no incoming links
                if (incomingLinks.length === 0) return true;
                // Its only incoming links are from Policies
                return incomingLinks.every(l => nodesMap.get(l.source)?.type === ElementType.Policy);
            }
            return false;
        });

        startNodes.forEach((startNode, index) => {
            if (nodeSliceMap.has(startNode.id)) return; // Already part of another slice

            const slice: Slice = {
                id: uuidv4(),
                nodeIds: new Set(),
                color: SLICE_COLORS[index % SLICE_COLORS.length],
            };
            
            const queue: string[] = [startNode.id];
            const visitedInSlice = new Set<string>([startNode.id]);

            while (queue.length > 0) {
                const currentNodeId = queue.shift()!;
                const currentNode = nodesMap.get(currentNodeId)!;

                // Don't traverse into a node that's already in another slice
                if (nodeSliceMap.has(currentNodeId) && nodeSliceMap.get(currentNodeId) !== slice.id) continue;
                
                nodeSliceMap.set(currentNodeId, slice.id);
                slice.nodeIds.add(currentNodeId);

                const outgoingLinks = linksFromNode.get(currentNodeId) ?? [];
                outgoingLinks.forEach(link => {
                    const targetNode = nodesMap.get(link.target)!;
                    
                    // Define the specific relationships that act as slice boundaries.
                    const isSliceBoundary = 
                        (currentNode.type === ElementType.View && targetNode.type === ElementType.Trigger) ||
                        (currentNode.type === ElementType.Policy && targetNode.type === ElementType.Command);

                    // If this link crosses a slice boundary, do not traverse it.
                    if (isSliceBoundary) {
                        return; // Stop traversal for this path.
                    }

                    if (validationService.isValidConnection(currentNode, targetNode) && !visitedInSlice.has(targetNode.id)) {
                        visitedInSlice.add(targetNode.id);
                        queue.push(targetNode.id);
                    }
                });
            }
            if (slice.nodeIds.size > 0) {
                slices.push(slice);
            }
        });

        return { slices, nodeSliceMap };
    }
}

const sliceService = new SliceService();
export default sliceService;
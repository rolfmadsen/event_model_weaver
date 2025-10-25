import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Node, Link, SimulationNode, SimulationLink, Slice } from '../types';
import { ELEMENT_STYLE, MIN_NODE_HEIGHT, NODE_WIDTH } from '../constants';
import validationService from '../services/validationService';

interface GraphCanvasProps {
  nodes: Node[];
  links: Link[];
  selectedId: string | null;
  slices: Slice[];
  nodeSliceMap: Map<string, string>;
  swimlanePositions: Map<string, { x: number; y: number }>;
  showSlices: boolean;
  onNodeClick: (node: Node) => void;
  onLinkClick: (link: Link) => void;
  onNodeDoubleClick: (node: Node) => void;
  onLinkDoubleClick: (link: Link) => void;
  onNodeDrag: (nodeId: string, x: number, y: number) => void;
  onAddLink: (sourceId: string, targetId: string) => void;
  onCanvasClick: (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => void;
}

const GRID_SIZE = 20;
const TRANSITION_DURATION = 600;

const measureText = (() => {
    let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
    let textElement: d3.Selection<SVGTextElement, unknown, null, undefined> | null = null;
  
    return (text: string, style: { fontSize: string, fontFamily: string }): number => {
      if (!svg) {
        svg = d3.create('svg').style('position', 'absolute').style('top', '-9999px').style('left', '-9999px');
        document.body.appendChild(svg.node()!);
        textElement = svg.append('text');
      }
      textElement!.text(text).style('font-size', style.fontSize).style('font-family', style.fontFamily);
      return textElement!.node()!.getComputedTextLength();
    };
})();

function wrapText(text: string, width: number, padding: number = 20): string[] {
  const words = text.split(/\s+/).reverse();
  const lines: string[] = [];
  let line: string[] = [];
  let word;
  const maxWidth = width - padding * 2;

  while ((word = words.pop())) {
    line.push(word);
    const measuredWidth = measureText(line.join(' '), { fontSize: '0.9rem', fontFamily: 'Roboto, sans-serif'});
    if (measuredWidth > maxWidth && line.length > 1) {
      line.pop();
      lines.push(line.join(' '));
      line = [word];
    }
  }
  lines.push(line.join(' '));
  return lines.filter(l => l.length > 0);
}

function calculateOrthogonalPath(source: SimulationNode, target: SimulationNode): { path: string, midPoint: { x: number, y: number } } {
    const sx = source.x!;
    const sy = source.y!;
    const tx = target.x!;
    const ty = target.y!;

    const w2 = NODE_WIDTH / 2;
    const sourceH2 = (source.computedHeight ?? MIN_NODE_HEIGHT) / 2;
    const targetH2 = (target.computedHeight ?? MIN_NODE_HEIGHT) / 2;

    const dx = tx - sx;
    const dy = ty - sy;

    let p1, p2, p3, p4, midPoint;

    if (Math.abs(dx) > Math.abs(dy)) {
        p1 = { x: sx + Math.sign(dx) * w2, y: sy };
        p4 = { x: tx - Math.sign(dx) * w2, y: ty };
        const midX = sx + dx / 2;
        p2 = { x: midX, y: p1.y };
        p3 = { x: midX, y: p4.y };
        midPoint = { x: midX, y: (p1.y + p4.y) / 2 };
    } else {
        p1 = { x: sx, y: sy + Math.sign(dy) * sourceH2 };
        p4 = { x: tx, y: ty - Math.sign(dy) * targetH2 };
        const midY = sy + dy / 2;
        p2 = { x: p1.x, y: midY };
        p3 = { x: p4.x, y: midY };
        midPoint = { x: (p1.x + p4.x) / 2, y: midY };
    }
    
    return {
        path: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y}`,
        midPoint,
    };
}


const GraphCanvas: React.FC<GraphCanvasProps> = ({ nodes, links, selectedId, slices, nodeSliceMap, swimlanePositions, showSlices, onNodeClick, onLinkClick, onNodeDoubleClick, onLinkDoubleClick, onNodeDrag, onAddLink, onCanvasClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomContainerRef = useRef<SVGGElement>(null);
  const nodesRef = useRef<Map<string, SimulationNode>>(new Map());

  const onAddLinkRef = useRef(onAddLink);
  useEffect(() => { onAddLinkRef.current = onAddLink; }, [onAddLink]);

  useEffect(() => {
    const nodeMap = new Map<string, SimulationNode>();
    nodes.forEach(node => {
        const existing = nodesRef.current.get(node.id);
        const position = showSlices
          ? swimlanePositions.get(node.id) || { x: node.x, y: node.y }
          : { x: node.fx ?? node.x, y: node.fy ?? node.y };
          
        nodeMap.set(node.id, {
            ...node,
            x: position?.x ?? window.innerWidth / 2,
            y: position?.y ?? window.innerHeight / 2,
            fx: showSlices ? position?.x : node.fx,
            fy: showSlices ? position?.y : node.fy,
            computedHeight: existing?.computedHeight,
        });
    });
    nodesRef.current = nodeMap;
  }, [nodes, showSlices, swimlanePositions]);


  useEffect(() => {
    if (!svgRef.current || !zoomContainerRef.current) return;
    const svg = d3.select(svgRef.current);
    const zoomContainer = d3.select(zoomContainerRef.current);

    if (!svg.property('__zoom')) {
        const zoomHandler = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 4]).on('zoom', (event) => {
            zoomContainer.attr('transform', event.transform);
        });
        svg.call(zoomHandler).on('dblclick.zoom', null);
    }

    let potentialTargetNode: SimulationNode | null = null;
    let isConnectionValid = false;
    
    // FIX: Refactored to use an if/else block to resolve TypeScript union type ambiguity between d3.Selection and d3.Transition.
    const redrawLinksForNode = (nodeId: string, transition: d3.Transition<any, any, any, any> | null) => {
        const affectedLinks = links.filter(l => l.source === nodeId || l.target === nodeId);
        affectedLinks.forEach(link => {
            const linkGroup = zoomContainer.select<SVGGElement>(`#link-${link.id}`);
            if (!linkGroup.empty()) {
                const sourceNode = nodesRef.current.get(link.source);
                const targetNode = nodesRef.current.get(link.target);
                if (sourceNode && targetNode) {
                    const { path, midPoint } = calculateOrthogonalPath(sourceNode, targetNode);
                    if (transition) {
                        const t = linkGroup.transition(transition);
                        t.select('.link-path').attr('d', path);
                        t.select('.link-hitbox').attr('d', path);
                        t.select('.link-label').attr('x', midPoint.x).attr('y', midPoint.y);
                    } else {
                        linkGroup.select('.link-path').attr('d', path);
                        linkGroup.select('.link-hitbox').attr('d', path);
                        linkGroup.select('.link-label').attr('x', midPoint.x).attr('y', midPoint.y);
                    }
                }
            }
        });
    };

    const moveHandler = d3.drag<SVGGElement, SimulationNode>()
        .on('start', function() { if (!showSlices) d3.select(this).raise(); })
        .on('drag', function(event, d) {
            if (showSlices) return;
            const snappedX = Math.round(event.x / GRID_SIZE) * GRID_SIZE;
            const snappedY = Math.round(event.y / GRID_SIZE) * GRID_SIZE;
            d.fx = snappedX; d.fy = snappedY; d.x = snappedX; d.y = snappedY;
            const height = d.computedHeight ?? MIN_NODE_HEIGHT;
            d3.select(this).attr('transform', `translate(${snappedX - NODE_WIDTH/2}, ${snappedY - height/2})`);
            redrawLinksForNode(d.id, null);
        })
        .on('end', (_, d) => {
            if (showSlices) return;
            if (d.fx != null && d.fy != null) { onNodeDrag(d.id, d.fx, d.fy); }
        });

    const linkDragHandler = d3.drag<SVGCircleElement, { parentNode: SimulationNode; pos: { x: number; y: number } }>()
        .on('start', function(event) {
            d3.select(this.closest('.node-group')).raise();
            const [startX, startY] = d3.pointer(event, zoomContainer.node()!);
            zoomContainer.append('path').attr('class', 'temp-link').property('__startCoords__', { x: startX, y: startY })
                .attr('d', `M${startX},${startY}L${startX},${startY}`).attr('marker-end', 'url(#arrowhead-linking)');
        })
        .on('drag', function(event, d) {
            const tempLink = zoomContainer.select<SVGPathElement>('.temp-link');
            if (tempLink.empty()) return;
            const startCoords = tempLink.property('__startCoords__');
            const [pointerX, pointerY] = d3.pointer(event, zoomContainer.node()!);
            tempLink.attr('d', `M${startCoords.x},${startCoords.y}L${pointerX},${pointerY}`);

            const sourceNode = d.parentNode;
            const allNodes = zoomContainer.selectAll<SVGGElement, SimulationNode>('.node-group');
            potentialTargetNode = null;
            isConnectionValid = false;
            
            allNodes.each(function(nodeData) {
                const nodeX = nodeData.x!;
                const nodeY = nodeData.y!;
                const nodeHeight = nodeData.computedHeight ?? MIN_NODE_HEIGHT;
                const isHovered = pointerX > nodeX - NODE_WIDTH / 2 && pointerX < nodeX + NODE_WIDTH / 2 &&
                                  pointerY > nodeY - nodeHeight / 2 && pointerY < nodeY + nodeHeight / 2;
                if (isHovered && nodeData.id !== sourceNode.id) {
                    potentialTargetNode = nodeData;
                    isConnectionValid = validationService.isValidConnection(sourceNode, nodeData);
                }
            });

            allNodes.classed('linking-target-valid', n => potentialTargetNode?.id === n.id && isConnectionValid);
            allNodes.classed('linking-target-invalid', n => potentialTargetNode?.id === n.id && !isConnectionValid);
            svg.classed('cursor-crosshair', isConnectionValid).classed('cursor-not-allowed', !!potentialTargetNode && !isConnectionValid);
        })
        .on('end', function(_, d) {
            zoomContainer.select('.temp-link').remove();
            zoomContainer.selectAll('.node-group').classed('linking-target-valid', false).classed('linking-target-invalid', false);
            svg.classed('cursor-crosshair', false).classed('cursor-not-allowed', false);
            if (potentialTargetNode && isConnectionValid) { onAddLinkRef.current(d.parentNode.id, potentialTargetNode.id); }
            potentialTargetNode = null; isConnectionValid = false;
        });
    
    // --- SLICE RENDERING ---
    const sliceContainer = zoomContainer.select<SVGGElement>('.slices');
    // FIX: Corrected D3 data binding to provide type arguments to `selectAll` instead of `data` to match modern @types/d3.
    // This resolves TypeScript errors related to `selectAll` overloads and subsequent `.merge` calls.
    const sliceRects = sliceContainer.selectAll<SVGRectElement, Slice>('rect').data(showSlices ? slices : [], d => d.id);
    sliceRects.exit().transition().duration(TRANSITION_DURATION).attr('opacity', 0).remove();
    const sliceEnter = sliceRects.enter().append('rect').attr('rx', 16).attr('ry', 16).attr('opacity', 0);
    sliceRects.merge(sliceEnter)
      .each(function(d) {
        const sliceNodes = Array.from(d.nodeIds).map(id => nodesRef.current.get(id)!);
        if (sliceNodes.length === 0 || sliceNodes.some(n => !n)) return;
        const xCoords = sliceNodes.map(n => n.x!);
        const yCoords = sliceNodes.map(n => n.y!);
        const heights = sliceNodes.map(n => n.computedHeight ?? MIN_NODE_HEIGHT);
        const PADDING = 40;
        d.x = d3.min(xCoords)! - NODE_WIDTH / 2 - PADDING;
        d.y = d3.min(yCoords)! - d3.min(heights)! / 2 - PADDING;
        d.width = d3.max(xCoords)! - d3.min(xCoords)! + NODE_WIDTH + PADDING * 2;
        d.height = d3.max(yCoords)! - d3.min(yCoords)! + d3.max(heights)! + PADDING * 2;
      })
      .transition().duration(TRANSITION_DURATION)
      .attr('x', d => d.x!).attr('y', d => d.y!).attr('width', d => d.width!).attr('height', d => d.height!)
      .attr('fill', d => d.color).attr('stroke', d => d3.color(d.color)!.darker(0.5).toString()).attr('stroke-width', 2).attr('opacity', 1);


    const simulationLinks: SimulationLink[] = links.map(l => ({...l, source: nodesRef.current.get(l.source)!, target: nodesRef.current.get(l.target)!})).filter(l => l.source && l.target);

    const linkGroups = zoomContainer.select<SVGGElement>('.links').selectAll<SVGGElement, SimulationLink>('.link-group').data(simulationLinks, d => d.id);
    linkGroups.exit().remove();
    const linkEnter = linkGroups.enter().append('g').attr('class', 'link-group').attr('id', d => `link-${d.id}`);
    linkEnter.append('path').attr('class', 'link-hitbox');
    linkEnter.append('path').attr('class', 'link-path');
    linkEnter.append('text').attr('class', 'link-label').attr('text-anchor', 'middle').attr('dy', '-6');
    const linkUpdate = linkGroups.merge(linkEnter);
    linkUpdate.on('click', (event, d) => { event.stopPropagation(); onLinkClick(d as unknown as Link); }).on('dblclick', (event, d) => { event.stopPropagation(); onLinkDoubleClick(d as unknown as Link); });
    
    const t = svg.transition().duration(TRANSITION_DURATION);
    
    linkUpdate.each(function(d) {
        const group = d3.select(this);
        const isInterSlice = showSlices && nodeSliceMap.has(d.source.id) && nodeSliceMap.has(d.target.id) && nodeSliceMap.get(d.source.id) !== nodeSliceMap.get(d.target.id);
        group.classed('inter-slice', isInterSlice);
        group.select('.link-path').attr('marker-end', isInterSlice ? 'url(#arrowhead-inter-slice)' : 'url(#arrowhead)');
        
        const { path, midPoint } = calculateOrthogonalPath(d.source, d.target);
        group.transition(t).select('.link-path').attr('d', path);
        group.transition(t).select('.link-hitbox').attr('d', path);
        group.transition(t).select('.link-label').text(d.label).attr('x', midPoint.x).attr('y', midPoint.y);
    });

    // FIX: Corrected D3 data binding to provide type arguments to `selectAll` instead of `data` for type safety.
    const nodeElements = zoomContainer.select<SVGGElement>('.nodes').selectAll<SVGGElement, SimulationNode>('.node-group').data(Array.from(nodesRef.current.values()), d => d.id);
    nodeElements.exit().transition(t).attr('opacity', 0).remove();
    const nodeEnter = nodeElements.enter().append('g').attr('class', 'node-group').attr('id', d => `node-${d.id}`).attr('filter', 'url(#shadow)').call(moveHandler as any);
    nodeEnter.attr('transform', d => `translate(${(d.fx ?? d.x!) - NODE_WIDTH/2}, ${(d.fy ?? d.y!) - MIN_NODE_HEIGHT/2})`).attr('opacity', 0);
    
    nodeEnter.append('path').attr('class', 'node-shape');
    nodeEnter.append('text').attr('class', 'node-text');
    
    const nodeUpdate = nodeElements.merge(nodeEnter);

    nodeUpdate.each(function(d) {
        const group = d3.select(this);
        const style = ELEMENT_STYLE[d.type];
        const textElement = group.select<SVGTextElement>('.node-text');
        textElement.selectAll('*').remove();
        
        const PADDING_Y = 12;
        const LINE_HEIGHT = 18;
        const STEREOTYPE_HEIGHT = 16;
        let requiredHeight = PADDING_Y * 2;
        
        const stereotypeLine = d.stereotype ? `<<${d.type} - ${d.stereotype}>>` : `<<${d.type}>>`;
        textElement.append('tspan').attr('class', 'stereotype-text').text(stereotypeLine);
        requiredHeight += STEREOTYPE_HEIGHT;

        const wrappedName = wrapText(d.name, NODE_WIDTH);
        wrappedName.forEach((line) => {
            textElement.append('tspan').text(line);
            requiredHeight += LINE_HEIGHT;
        });

        d.computedHeight = Math.max(MIN_NODE_HEIGHT, requiredHeight);
        const height = d.computedHeight;

        const shapeElement = group.select('.node-shape').attr('fill', style.color);
        const CORNER_SIZE = 12;
        switch (style.shape) {
            case 'circle': {
                const r = height / 2;
                shapeElement.attr('d', `M 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 H ${NODE_WIDTH - r} A ${r} ${r} 0 0 1 ${NODE_WIDTH} ${r} V ${height - r} A ${r} ${r} 0 0 1 ${NODE_WIDTH - r} ${height} H ${r} A ${r} ${r} 0 0 1 0 ${height - r} Z`);
                break;
            }
            case 'diamond': 
                shapeElement.attr('d', `M ${NODE_WIDTH/2} 0 L ${NODE_WIDTH} ${height/2} L ${NODE_WIDTH/2} ${height} L 0 ${height/2} Z`); 
                break;
            case 'beveled-rect':
                shapeElement.attr('d', `M ${CORNER_SIZE} 0 L ${NODE_WIDTH - CORNER_SIZE} 0 L ${NODE_WIDTH} ${CORNER_SIZE} L ${NODE_WIDTH} ${height - CORNER_SIZE} L ${NODE_WIDTH - CORNER_SIZE} ${height} L ${CORNER_SIZE} ${height} L 0 ${height - CORNER_SIZE} L 0 ${CORNER_SIZE} Z`);
                break;
            default: // rect (rounded)
                shapeElement.attr('d', `M 0 ${CORNER_SIZE} A ${CORNER_SIZE} ${CORNER_SIZE} 0 0 1 ${CORNER_SIZE} 0 H ${NODE_WIDTH - CORNER_SIZE} A ${CORNER_SIZE} ${CORNER_SIZE} 0 0 1 ${NODE_WIDTH} ${CORNER_SIZE} V ${height - CORNER_SIZE} A ${CORNER_SIZE} ${CORNER_SIZE} 0 0 1 ${NODE_WIDTH - CORNER_SIZE} ${height} H ${CORNER_SIZE} A ${CORNER_SIZE} ${CORNER_SIZE} 0 0 1 0 ${height-CORNER_SIZE} Z`); 
                break;
        }

        const totalTextHeight = STEREOTYPE_HEIGHT + wrappedName.length * LINE_HEIGHT;
        const startY = (height - totalTextHeight) / 2;

        textElement.attr('x', NODE_WIDTH / 2).attr('y', startY).attr('fill', style.textColor)
            .attr('class', 'node-text font-medium pointer-events-none').attr('text-anchor', 'middle');
        const tspans = textElement.selectAll('tspan').attr('x', NODE_WIDTH / 2);
        textElement.select('.stereotype-text').attr('dy', `${PADDING_Y}px`).style('font-size', '0.75rem').style('opacity', 0.8).style('text-transform', 'capitalize');
        tspans.filter((_, i) => i > 0).attr('dy', `${LINE_HEIGHT}px`).style('font-size', '0.9rem');

        const handlePositions = [{ x: NODE_WIDTH / 2, y: 0 }, { x: NODE_WIDTH, y: height / 2 }, { x: NODE_WIDTH / 2, y: height }, { x: 0, y: height / 2 }];
        const handleData = handlePositions.map(pos => ({ parentNode: d as SimulationNode, pos }));
        const handles = group.selectAll('.link-handle').data(handleData);
        handles.enter().append('circle').attr('class', 'link-handle').attr('r', 8).call(linkDragHandler as any);
        handles.attr('cx', p => p.pos.x).attr('cy', p => p.pos.y);
    });
        
    nodeUpdate
        .on('click', (event, d) => { event.stopPropagation(); onNodeClick(d as Node); })
        .on('dblclick', (event, d) => { event.stopPropagation(); onNodeDoubleClick(d as Node); })
        .classed('selected', d => d.id === selectedId);
        
    nodeUpdate.transition(t)
        .attr('opacity', 1)
        .attr('transform', d => `translate(${(d.x!) - NODE_WIDTH/2}, ${(d.y!) - (d.computedHeight ?? MIN_NODE_HEIGHT)/2})`);

  }, [nodes, links, onNodeDrag, onNodeClick, onLinkClick, onNodeDoubleClick, onLinkDoubleClick, selectedId, showSlices, slices, nodeSliceMap, swimlanePositions]);

  const style = `
    .cursor-crosshair { cursor: crosshair; }
    .cursor-not-allowed { cursor: not-allowed; }
    .node-group.selected > .node-shape { stroke: #4f46e5; stroke-width: 3px; }
    .linking-target-valid > .node-shape { stroke: #22c55e !important; stroke-width: 4px !important; transition: stroke 0.2s, stroke-width 0.2s; }
    .linking-target-invalid > .node-shape { stroke: #ef4444 !important; stroke-width: 4px !important; transition: stroke 0.2s, stroke-width 0.2s; }
    .temp-link { stroke: #a855f7; stroke-width: 2px; stroke-dasharray: 5 5; pointer-events: none; }
    .link-group { cursor: pointer; }
    .link-hitbox { stroke: transparent; stroke-width: 20px; fill: none; }
    .link-path { stroke: #9ca3af; stroke-width: 2px; fill: none; transition: stroke 0.2s; }
    .link-label { font-size: 12px; fill: #4b5563; pointer-events: none; user-select: none; transition: fill 0.2s; stroke: #f9fafb; stroke-width: 3px; paint-order: stroke; }
    .link-group.selected .link-path, .link-group:hover .link-path { stroke: #4f46e5; }
    .link-group.selected .link-label { fill: #4f46e5; font-weight: 500; }
    .link-handle { fill: #4f46e5; stroke: #ffffff; stroke-width: 2px; opacity: 0; cursor: crosshair; transition: opacity 0.2s ease-in-out; }
    .node-group:hover .link-handle { opacity: 1; }
    .slices rect { transition: all ${TRANSITION_DURATION}ms ease-in-out; }
    .link-group.inter-slice .link-path { stroke: #a855f7; stroke-width: 3px; stroke-dasharray: 6 4; }
    .link-group.inter-slice .link-label { fill: #a855f7; font-weight: 500; }
  `;

  return (
    <div className={`w-full h-screen absolute top-0 left-0 bg-gray-50 ${showSlices ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}>
        <style>{style.replace(/\n/g, ' ')}</style>
        <svg ref={svgRef} className="w-full h-full" onClick={onCanvasClick}>
            <defs>
                <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" fill="#d1d5db"></circle>
                </pattern>
                <marker id="arrowhead" viewBox="0 -5 10 10" refX="8" refY="0" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M0,-5L10,0L0,5" className="fill-current text-gray-400"></path>
                </marker>
                 <marker id="arrowhead-inter-slice" viewBox="0 -5 10 10" refX="8" refY="0" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M0,-5L10,0L0,5" className="fill-current text-purple-500"></path>
                </marker>
                <marker id="arrowhead-linking" viewBox="0 -5 10 10" refX="10" refY="0" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M0,-5L10,0L0,5" className="fill-current text-purple-500"></path>
                </marker>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.15"/>
                </filter>
            </defs>
            <g ref={zoomContainerRef}>
              <rect width="10000" height="10000" x="-5000" y="-5000" fill="url(#grid)"></rect>
              <g className="slices"></g>
              <g className="links"></g>
              <g className="nodes"></g>
            </g>
        </svg>
    </div>
  );
};

export default GraphCanvas;
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import GraphCanvas from './components/GraphCanvas';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import Header from './components/Header';
import Footer from './components/Footer';
import { Node, Link, ElementType, ModelData, Slice } from './types';
import gunService from './services/gunService';
import validationService from './services/validationService';
import sliceService from './services/sliceService';
import layoutService from './services/layoutService';

const App: React.FC = () => {
  const [modelId, setModelId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selection, setSelection] = useState<{ type: 'node' | 'link'; id: string } | null>(null);
  const [focusOnRender, setFocusOnRender] = useState(false);
  const [showSlices, setShowSlices] = useState(false);
  
  const manualPositionsRef = useRef(new Map<string, { x: number, y: number }>());

  useEffect(() => {
    // --- Model Initialization from URL Hash ---
    const getModelIdFromHash = () => window.location.hash.replace(/^#/, '');
    
    let currentModelId = getModelIdFromHash();
    if (!currentModelId) {
      currentModelId = uuidv4();
      window.location.hash = currentModelId;
    }
    setModelId(currentModelId);
    
    // --- GUN Data Subscriptions ---
    const nodesMap = new Map<string, Node>();
    const linksMap = new Map<string, Link>();

    const nodesGraph = gunService.getModel(currentModelId).get('nodes');
    nodesGraph.map().on((nodeData, nodeId) => {
      if (nodeData) {
        const existingNode = nodesMap.get(nodeId) || {};
        const updatedNode = { ...existingNode, ...nodeData, id: nodeId };
        nodesMap.set(nodeId, updatedNode);
        if (updatedNode.fx != null && updatedNode.fy != null) {
          manualPositionsRef.current.set(nodeId, { x: updatedNode.fx, y: updatedNode.fy });
        }
        setNodes(Array.from(nodesMap.values()));
      } else {
         nodesMap.delete(nodeId);
         manualPositionsRef.current.delete(nodeId);
         setNodes(Array.from(nodesMap.values()));
      }
    });
    
    const linksGraph = gunService.getModel(currentModelId).get('links');
    linksGraph.map().on((linkData, linkId) => {
       if (linkData) {
        const existingLink = linksMap.get(linkId) || {};
        linksMap.set(linkId, { ...existingLink, ...linkData, id: linkId });
        setLinks(Array.from(linksMap.values()));
      } else {
        linksMap.delete(linkId);
        setLinks(Array.from(linksMap.values()));
      }
    });

    const handleHashChange = () => {
      window.location.reload(); // Simplest way to switch models for this context
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const { slices, nodeSliceMap, swimlanePositions } = useMemo(() => {
    if (!showSlices || nodes.length === 0) {
      return { slices: [], nodeSliceMap: new Map(), swimlanePositions: new Map() };
    }
    const { slices, nodeSliceMap } = sliceService.calculateSlices(nodes, links);
    const swimlanePositions = layoutService.calculateSwimlaneLayout(slices, nodes, links, window.innerWidth);
    return { slices, nodeSliceMap, swimlanePositions };
  }, [showSlices, nodes, links]);

  const handleToggleSlices = useCallback(() => {
    const isEnabling = !showSlices;
    if (isEnabling) {
      // Unfix all nodes to allow animation
      const updatedNodes = nodes.map(n => ({...n, fx: null, fy: null}));
      setNodes(updatedNodes);
    } else {
      // Restore manual positions and fix them
      const updatedNodes = nodes.map(n => {
        const manualPos = manualPositionsRef.current.get(n.id);
        return {...n, fx: manualPos?.x ?? n.x, fy: manualPos?.y ?? n.y };
      });
      setNodes(updatedNodes);
    }
    setShowSlices(isEnabling);
  }, [showSlices, nodes]);

  const handleAddNode = useCallback((type: ElementType) => {
    if (!modelId) return;
    // New nodes are always created with a "manual" home position.
    const manualX = window.innerWidth / 2 + (Math.random() - 0.5) * 50;
    const manualY = window.innerHeight / 2 + (Math.random() - 0.5) * 50;
    
    const newNode: Node = {
      id: uuidv4(),
      type,
      name: `New ${type.charAt(0) + type.slice(1).toLowerCase()}`,
      description: '',
      x: manualX,
      y: manualY,
      // Fix the position in the manual layout.
      fx: manualX,
      fy: manualY,
    };

    if (type === ElementType.Trigger) {
        newNode.stereotype = 'Actor'; // Default stereotype
    }
    
    gunService.getModel(modelId).get('nodes').get(newNode.id).put(newNode as any);
    
    if (showSlices) {
      // If in slice view, un-fix the node immediately to let it animate.
      // A brief timeout allows React to process the state update first.
      setTimeout(() => {
          setNodes(prevNodes => prevNodes.map(n => n.id === newNode.id ? {...n, fx: null, fy: null} : n));
      }, 50);
    }

    setSelection({ type: 'node', id: newNode.id });
    setFocusOnRender(true);
  }, [modelId, showSlices]);

  const handleNodeClick = useCallback((node: Node) => {
    setSelection({ type: 'node', id: node.id });
    setFocusOnRender(false);
  }, []);

  const handleLinkClick = useCallback((link: Link) => {
    setSelection({ type: 'link', id: link.id });
    setFocusOnRender(false);
  }, []);

  const handleNodeDoubleClick = useCallback((node: Node) => {
    setSelection({ type: 'node', id: node.id });
    setFocusOnRender(true);
  }, []);

  const handleLinkDoubleClick = useCallback((link: Link) => {
    setSelection({ type: 'link', id: link.id });
    setFocusOnRender(true);
  }, []);

  const handleAddLink = useCallback((sourceId: string, targetId: string) => {
    if (!modelId || sourceId === targetId) return;
    
    const sourceNode = nodes.find(n => n.id === sourceId);
    const targetNode = nodes.find(n => n.id === targetId);

    const rule = validationService.getConnectionRule(sourceNode!, targetNode!);
    if (!rule) return;

    if (links.some(l => l.source === sourceId && l.target === targetId)) return;

    const newLink: Link = { id: uuidv4(), source: sourceId, target: targetId, label: rule.verb };
    
    gunService.getModel(modelId).get('links').get(newLink.id).put(newLink as any);
    setSelection({ type: 'link', id: newLink.id });
    setFocusOnRender(true);
  }, [nodes, links, modelId]);

  const handleUpdateNode = useCallback((updatedNode: Node) => {
    if (!modelId) return;
    const originalNode = nodes.find(n => n.id === updatedNode.id);
    if (!originalNode) return;
    const changes: Partial<Node> = {};
    Object.keys(updatedNode).forEach(key => {
        const typedKey = key as keyof Node;
        if (updatedNode[typedKey] !== originalNode[typedKey]) {
            (changes as any)[typedKey] = updatedNode[typedKey];
        }
    });
    if (Object.keys(changes).length > 0) {
        gunService.getModel(modelId).get('nodes').get(updatedNode.id).put(changes as any);
    }
  }, [modelId, nodes]);
  
  const handleUpdateLink = useCallback((updatedLink: Link) => {
    if (!modelId) return;
    const originalLink = links.find(l => l.id === updatedLink.id);
    if (!originalLink) return;
    const changes: Partial<Link> = {};
    Object.keys(updatedLink).forEach(key => {
        const typedKey = key as keyof Link;
        if (updatedLink[typedKey] !== originalLink[typedKey]) {
            (changes as any)[typedKey] = updatedLink[typedKey];
        }
    });
    if (Object.keys(changes).length > 0) {
        gunService.getModel(modelId).get('links').get(updatedLink.id).put(changes as any);
    }
  }, [modelId, links]);

  const handleDeleteLink = useCallback((linkId: string) => {
    if (!modelId) return;
    gunService.getModel(modelId).get('links').get(linkId).put(null as any);
    setSelection(null);
  }, [modelId]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (!modelId) return;
    gunService.getModel(modelId).get('nodes').get(nodeId).put(null as any);
    const linksToDelete = links.filter(link => link.source === nodeId || link.target === nodeId);
    linksToDelete.forEach(link => {
      gunService.getModel(modelId).get('links').get(link.id).put(null as any);
    });
    setSelection(null);
  }, [modelId, links]);

  const handleNodeDrag = useCallback((nodeId: string, x: number, y: number) => {
    if (!modelId || showSlices) return; // Don't allow dragging in slice view
    gunService.getModel(modelId).get('nodes').get(nodeId).put({ fx: x, fy: y } as any);
  }, [modelId, showSlices]);

  const handleExport = useCallback(() => {
      const data: ModelData = { nodes, links };
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-model-${modelId}.json`;
      a.click();
      URL.revokeObjectURL(url);
  }, [nodes, links, modelId]);
  
  const handleImport = useCallback((file: File) => {
    if (!modelId) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const result = e.target?.result;
            if (typeof result !== 'string') throw new Error('File read error');
            const data: ModelData = JSON.parse(result);
            if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) throw new Error('Invalid file format');
            
            const modelGraph = gunService.getModel(modelId);
            nodes.forEach(node => modelGraph.get('nodes').get(node.id).put(null as any));
            links.forEach(link => modelGraph.get('links').get(link.id).put(null as any));
            
            data.nodes.forEach(node => modelGraph.get('nodes').get(node.id).put(node as any));
            data.links.forEach(link => modelGraph.get('links').get(link.id).put(link as any));
            
            setSelection(null);
        } catch (error) {
            alert('Failed to import model: ' + (error as Error).message);
        }
    };
    reader.readAsText(file);
  }, [modelId, nodes, links]);

  const handleClosePanel = useCallback(() => setSelection(null), []);
  const handleCanvasClick = useCallback(() => setSelection(null), []);
  const handleFocusHandled = useCallback(() => setFocusOnRender(false), []);

  const selectedItem = selection
    ? selection.type === 'node'
        ? { type: 'node' as const, data: nodes.find(n => n.id === selection.id) }
        : { type: 'link' as const, data: links.find(l => l.id === selection.id) }
    : null;

  return (
    <div className="w-screen h-screen overflow-hidden relative font-sans">
      <Header onImport={handleImport} onExport={handleExport} onToggleSlices={handleToggleSlices} slicesVisible={showSlices} />
      <GraphCanvas 
          nodes={nodes} 
          links={links}
          selectedId={selection?.id ?? null}
          slices={slices}
          nodeSliceMap={nodeSliceMap}
          swimlanePositions={swimlanePositions}
          showSlices={showSlices}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onLinkDoubleClick={handleLinkDoubleClick}
          onNodeDrag={handleNodeDrag}
          onAddLink={handleAddLink}
          onCanvasClick={handleCanvasClick}
      />
      <Toolbar onAddNode={handleAddNode} disabled={!modelId} />
      {selectedItem?.data && (
        <PropertiesPanel
          selectedItem={selectedItem}
          onUpdateNode={handleUpdateNode}
          onUpdateLink={handleUpdateLink}
          onDeleteLink={handleDeleteLink}
          onDeleteNode={handleDeleteNode}
          onClose={handleClosePanel}
          focusOnRender={focusOnRender}
          onFocusHandled={handleFocusHandled}
        />
      )}
      <Footer />
    </div>
  );
};

export default App;
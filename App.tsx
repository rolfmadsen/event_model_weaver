import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import GraphCanvas from './components/GraphCanvas';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import Header from './components/Header';
import Footer from './components/Footer';
import { Node, Link, ElementType, ModelData } from './types';
import gunService, { UserPresence, CursorPosition } from './services/gunService';
import validationService from './services/validationService';
import sliceService from './services/sliceService';
import layoutService from './services/layoutService';

// Generate a unique user ID for this session
const USER_ID = uuidv4();
const USER_NAME = `User ${USER_ID.slice(0, 4)}`;
const USER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
const USER_COLOR = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

const App: React.FC = () => {
  const [modelId, setModelId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selection, setSelection] = useState<{ type: 'node' | 'link'; id: string } | null>(null);
  const [focusOnRender, setFocusOnRender] = useState(false);
  const [showSlices, setShowSlices] = useState(false);
  
  // Collaboration state
  const [activeUsers, setActiveUsers] = useState<Record<string, UserPresence>>({});
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});
  
  // This is where recenterToggle is defined
  const [recenterToggle, setRecenterToggle] = useState(false);

  const manualPositionsRef = useRef(new Map<string, { x: number, y: number }>());
  const presenceIntervalRef = useRef<number | undefined>(undefined);
  const cursorThrottleRef = useRef<number | undefined>(undefined);

  // Initialize model and subscriptions
  useEffect(() => {
    const getModelIdFromHash = () => window.location.hash.replace(/^#/, '');
    
    let currentModelId = getModelIdFromHash();
    if (!currentModelId) {
      currentModelId = uuidv4();
      window.location.hash = currentModelId;
    }
    setModelId(currentModelId);
    
    // Subscribe to nodes
    const nodesGraph = gunService.getModel(currentModelId).get('nodes');
    nodesGraph.map().on((nodeData: Partial<Node> | null, nodeId: string) => {
      setNodes(prevNodes => {
        const nodesMap = new Map(prevNodes.map(n => [n.id, n]));
        if (nodeData) {
          const existingNode = nodesMap.get(nodeId) || {};
          const updatedNode = { ...existingNode, ...nodeData, id: nodeId } as Node;
          nodesMap.set(nodeId, updatedNode);
          if (updatedNode.fx != null && updatedNode.fy != null) {
            manualPositionsRef.current.set(nodeId, { x: updatedNode.fx, y: updatedNode.fy });
          }
        } else {
          nodesMap.delete(nodeId);
          manualPositionsRef.current.delete(nodeId);
        }
        return Array.from(nodesMap.values());
      });
    });
    
    // Subscribe to links
    const linksGraph = gunService.getModel(currentModelId).get('links');
    linksGraph.map().on((linkData: Partial<Link> | null, linkId: string) => {
       setLinks(prevLinks => {
        const linksMap = new Map(prevLinks.map(l => [l.id, l]));
        if (linkData) {
          const existingLink = linksMap.get(linkId) || {};
          const updatedLink = { ...existingLink, ...linkData, id: linkId } as Link;
          linksMap.set(linkId, updatedLink);
        } else {
          linksMap.delete(linkId);
        }
        return Array.from(linksMap.values());
      });
    });

    // Subscribe to presence
    const unsubPresence = gunService.subscribeToPresence(currentModelId, (users) => {
      setActiveUsers(users);
    });

    // Subscribe to cursors
    const unsubCursors = gunService.subscribeToCursors(currentModelId, (cursors) => {
      setCursors(cursors);
    });

    // Update presence every 10 seconds
    gunService.updatePresence(currentModelId, USER_ID, USER_NAME, USER_COLOR);
    presenceIntervalRef.current = window.setInterval(() => {
      gunService.updatePresence(currentModelId, USER_ID, USER_NAME, USER_COLOR);
    }, 10000);

    const handleHashChange = () => {
      window.location.reload();
    };
    window.addEventListener('hashchange', handleHashChange);

    // Cleanup function
    return () => {
      // Stop presence updates
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
      
      // Remove user presence and cursor
      gunService.removePresence(currentModelId, USER_ID);
      gunService.removeCursor(currentModelId, USER_ID);
      
      // Unsubscribe from all GUN listeners
      nodesGraph.map().off();
      linksGraph.map().off();
      unsubPresence();
      unsubCursors();
      
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Track mouse movement for cursor sharing
  useEffect(() => {
    if (!modelId) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Throttle cursor updates to every 100ms
      if (cursorThrottleRef.current) return;
      
      cursorThrottleRef.current = window.setTimeout(() => {
        gunService.updateCursor(modelId, USER_ID, e.clientX, e.clientY);
        cursorThrottleRef.current = undefined;
      }, 100);
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }
    };
  }, [modelId]);

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
      const updatedNodes = nodes.map(n => ({...n, fx: null, fy: null}));
      setNodes(updatedNodes);
    } else {
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
    const manualX = window.innerWidth / 2 + (Math.random() - 0.5) * 50;
    const manualY = window.innerHeight / 2 + (Math.random() - 0.5) * 50;
    
    const newNode: Node = {
      id: uuidv4(),
      type,
      name: `New ${type.charAt(0) + type.slice(1).toLowerCase()}`,
      description: '',
      x: manualX,
      y: manualY,
      fx: manualX,
      fy: manualY,
    };
    if (type === ElementType.Trigger) {
        newNode.stereotype = 'Actor';
    }
    
    gunService.getModel(modelId).get('nodes').get(newNode.id).put(newNode as any, (ack: any) => {
      if (ack.err) {
        console.error('Failed to add node:', ack.err);
        alert('Failed to add node. Please try again.');
      }
    });
    
    if (showSlices) {
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
    
    gunService.getModel(modelId).get('links').get(newLink.id).put(newLink as any, (ack: any) => {
      if (ack.err) {
        console.error('Failed to add link:', ack.err);
        alert('Failed to add link. Please try again.');
      }
    });
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
        gunService.getModel(modelId).get('nodes').get(updatedNode.id).put(changes as any, (ack: any) => {
          if (ack.err) {
            console.error('Failed to update node:', ack.err);
          }
        });
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
        gunService.getModel(modelId).get('links').get(updatedLink.id).put(changes as any, (ack: any) => {
          if (ack.err) {
            console.error('Failed to update link:', ack.err);
          }
        });
    }
  }, [modelId, links]);

  const handleDeleteLink = useCallback((linkId: string) => {
    if (!modelId) return;
    gunService.getModel(modelId).get('links').get(linkId).put(null as any, (ack: any) => {
      if (ack.err) {
        console.error('Failed to delete link:', ack.err);
      }
    });
    setSelection(null);
  }, [modelId]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (!modelId) return;
    gunService.getModel(modelId).get('nodes').get(nodeId).put(null as any, (ack: any) => {
      if (ack.err) {
        console.error('Failed to delete node:', ack.err);
      }
    });
    const linksToDelete = links.filter(link => link.source === nodeId || link.target === nodeId);
    linksToDelete.forEach(link => {
      gunService.getModel(modelId).get('links').get(link.id).put(null as any);
    });
    setSelection(null);
  }, [modelId, links]);

  const handleNodeDrag = useCallback((nodeId: string, x: number, y: number) => {
    if (!modelId || showSlices) return;
    
    setNodes(prevNodes => prevNodes.map(n => 
      n.id === nodeId ? { ...n, x, y, fx: x, fy: y } : n
    ));
    
    manualPositionsRef.current.set(nodeId, { x, y });
    
    const positionUpdate = { x, y, fx: x, fy: y };
    gunService.getModel(modelId).get('nodes').get(nodeId).put(positionUpdate as any, (ack: any) => {
      if (ack.err) {
        console.error('Failed to update node position:', ack.err);
      }
    });
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

            // This updates the state
            setRecenterToggle(prev => !prev);

        } catch (error) {
            alert('Failed to import model: ' + (error as Error).message);
        }
    };
    reader.readAsText(file);
  }, [modelId, nodes, links]);

  const handleClosePanel = useCallback(() => setSelection(null), []);
  const handleCanvasClick = useCallback(() => setSelection(null), []);
  const handleFocusHandled = useCallback(() => setFocusOnRender(false), []);

  const selectedItem = useMemo(() => {
    if (!selection) return null;
    if (selection.type === 'node') {
      const node = nodes.find(n => n.id === selection.id);
      if (node) return { type: 'node' as const, data: node };
    } else {
      const link = links.find(l => l.id === selection.id);
      if (link) return { type: 'link' as const, data: link };
    }
    return null;
  }, [selection, nodes, links]);

  // Filter out current user from active users display
  const otherUsers = useMemo(() => {
    const filtered = { ...activeUsers };
    delete filtered[USER_ID];
    return filtered;
  }, [activeUsers]);

  // Filter out current user's cursor
  const otherCursors = useMemo(() => {
    const filtered = { ...cursors };
    delete filtered[USER_ID];
    return filtered;
  }, [cursors]);

  return (
    <div className="w-screen h-screen overflow-hidden relative font-sans">
      <Header onImport={handleImport} onExport={handleExport} onToggleSlices={handleToggleSlices} slicesVisible={showSlices} />
      
      {/* Active Users Indicator */}
      {Object.keys(otherUsers).length > 0 && (
        <div className="absolute top-16 right-4 bg-white shadow-lg rounded-lg p-3 z-50">
          <div className="text-xs font-semibold text-gray-600 mb-2">Active Users ({Object.keys(otherUsers).length})</div>
          {Object.values(otherUsers).map(user => (
            <div key={user.userId} className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: user.color }}
              />
              <span className="text-xs text-gray-700">{user.userName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Other Users' Cursors */}
      {Object.values(otherCursors).map(cursor => {
        const user = activeUsers[cursor.userId];
        // Skip if user data hasn't loaded yet
        if (!user || !user.color || !user.userName) return null;
        return (
          <div
            key={cursor.userId}
            className="absolute pointer-events-none z-50"
            style={{
              left: cursor.x,
              top: cursor.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div 
              className="w-4 h-4 rounded-full border-2 border-white"
              style={{ backgroundColor: user.color }}
            />
            <div 
              className="text-xs font-semibold mt-1 px-2 py-1 rounded bg-white shadow-md whitespace-nowrap"
              style={{ color: user.color }}
            >
              {user.userName}
            </div>
          </div>
        );
      })}

      {/* This is the line from the error. It now includes recenterToggle */}
      <GraphCanvas 
          nodes={nodes} 
          links={links}
          selectedId={selection?.id ?? null}
          slices={slices}
          nodeSliceMap={nodeSliceMap}
          swimlanePositions={swimlanePositions}
          showSlices={showSlices}
          recenterViewToggle={recenterToggle} 
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onLinkDoubleClick={handleLinkDoubleClick}
          onNodeDrag={handleNodeDrag}
          onAddLink={handleAddLink}
          onCanvasClick={handleCanvasClick}
      />
      <Toolbar onAddNode={handleAddNode} disabled={!modelId} />
      {selectedItem && (
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
import React, { useState, useEffect, useRef } from 'react';
import { Node, Link, ElementType } from '../types';
import { ELEMENT_STYLE } from '../constants';
import { CloseIcon, DeleteIcon } from './icons';

type SelectedItem = { type: 'node', data: Node } | { type: 'link', data: Link };

interface PropertiesPanelProps {
  selectedItem: SelectedItem | null;
  onUpdateNode: (updatedNode: Node) => void;
  onUpdateLink: (updatedLink: Link) => void;
  onDeleteLink: (linkId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
  focusOnRender: boolean;
  onFocusHandled: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedItem, onUpdateNode, onUpdateLink, onDeleteLink, onDeleteNode, onClose, focusOnRender, onFocusHandled }) => {
  if (!selectedItem) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-white/90 backdrop-blur-md shadow-2xl z-20 p-6 flex flex-col text-gray-800 border-l border-gray-200 transform transition-transform duration-300 ease-in-out">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold" style={{ color: selectedItem.type === 'node' ? ELEMENT_STYLE[selectedItem.data.type].color : '#4f46e5' }}>
          {selectedItem.type === 'node' ? selectedItem.data.type : 'RELATIONSHIP'}
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-200">
            <CloseIcon />
        </button>
      </div>
      
      <div className="flex-grow overflow-y-auto pr-2">
        {selectedItem.type === 'node' && <NodeEditor node={selectedItem.data} onUpdateNode={onUpdateNode} onDeleteNode={onDeleteNode} focusOnRender={focusOnRender} onFocusHandled={onFocusHandled} />}
        {selectedItem.type === 'link' && <LinkEditor link={selectedItem.data} onUpdateLink={onUpdateLink} onDeleteLink={onDeleteLink} focusOnRender={focusOnRender} onFocusHandled={onFocusHandled} />}
      </div>
    </div>
  );
};

interface EditorProps {
    focusOnRender: boolean;
    onFocusHandled: () => void;
}

const TRIGGER_STEREOTYPES = ['Actor', 'System', 'Automation'];

// --- Node Editor Component ---
const NodeEditor: React.FC<{ node: Node; onUpdateNode: (node: Node) => void; onDeleteNode: (nodeId: string) => void; } & EditorProps> = ({ node, onUpdateNode, onDeleteNode, focusOnRender, onFocusHandled }) => {
  const [localNode, setLocalNode] = useState(node);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalNode(node);
  }, [node]);

  useEffect(() => {
    if (focusOnRender) {
      nameInputRef.current?.focus();
      onFocusHandled();
    }
  }, [focusOnRender, onFocusHandled]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setLocalNode({ ...localNode, [e.target.name]: e.target.value });
  };

  const handleBlur = () => {
    if (JSON.stringify(localNode) !== JSON.stringify(node)) {
      onUpdateNode(localNode);
    }
  };

  return (
    <>
      <div className="mb-6 relative">
        <input
          ref={nameInputRef}
          type="text" id="name" name="name" value={localNode.name}
          onChange={handleInputChange} onBlur={handleBlur}
          className="w-full bg-gray-100 border-b-2 border-gray-300 rounded-t-lg p-3 pt-6 focus:outline-none focus:border-indigo-500 transition peer"
          placeholder=" " />
        <label htmlFor="name" className="absolute top-4 left-3 text-gray-500 transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-indigo-600">Name</label>
      </div>
       {node.type === ElementType.Trigger && (
        <div className="mb-6 relative">
          <select
            id="stereotype" name="stereotype" value={localNode.stereotype || ''}
            onChange={handleInputChange} onBlur={handleBlur}
            className="w-full bg-gray-100 border-b-2 border-gray-300 rounded-t-lg p-3 pt-6 focus:outline-none focus:border-indigo-500 transition peer appearance-none"
          >
            <option value="">None</option>
            {TRIGGER_STEREOTYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label htmlFor="stereotype" className="absolute top-1 left-3 text-xs text-indigo-600">Stereotype</label>
           <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
      )}
      <div className="mb-6 relative">
          <textarea
            id="description" name="description" rows={8} value={localNode.description}
            onChange={handleInputChange} onBlur={handleBlur}
            className="w-full bg-gray-100 border-b-2 border-gray-300 rounded-t-lg p-3 pt-6 focus:outline-none focus:border-indigo-500 transition peer"
            placeholder=" " />
          <label htmlFor="description" className="absolute top-4 left-3 text-gray-500 transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-indigo-600">Description</label>
      </div>
      <div className="mb-4">
          <label className="block text-sm font-medium text-gray-500 mb-1">ID</label>
          <p className="text-xs text-gray-500 bg-gray-100 p-3 rounded-lg font-mono break-all">{localNode.id}</p>
      </div>
      <div className="mt-8 border-t border-gray-200 pt-6">
        <button 
          onClick={() => onDeleteNode(node.id)}
          className="w-full flex items-center justify-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 font-medium py-3 px-4 rounded-lg transition"
        >
          <DeleteIcon />
          Delete Element
        </button>
      </div>
    </>
  );
};

// --- Link Editor Component ---
const LinkEditor: React.FC<{ link: Link; onUpdateLink: (link: Link) => void; onDeleteLink: (id: string) => void; } & EditorProps> = ({ link, onUpdateLink, onDeleteLink, focusOnRender, onFocusHandled }) => {
  const [localLink, setLocalLink] = useState(link);
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalLink(link);
  }, [link]);
  
  useEffect(() => {
    if (focusOnRender) {
      labelInputRef.current?.focus();
      onFocusHandled();
    }
  }, [focusOnRender, onFocusHandled]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalLink({ ...localLink, [e.target.name]: e.target.value });
  };

  const handleBlur = () => {
    if (JSON.stringify(localLink) !== JSON.stringify(link)) {
      onUpdateLink(localLink);
    }
  };

  return (
    <>
      <div className="mb-6 relative">
        <input
          ref={labelInputRef}
          type="text" id="label" name="label" value={localLink.label}
          onChange={handleInputChange} onBlur={handleBlur}
          className="w-full bg-gray-100 border-b-2 border-gray-300 rounded-t-lg p-3 pt-6 focus:outline-none focus:border-indigo-500 transition peer"
          placeholder=" " />
        <label htmlFor="label" className="absolute top-4 left-3 text-gray-500 transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs peer-focus:text-indigo-600">Label</label>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-500 mb-1">ID</label>
        <p className="text-xs text-gray-500 bg-gray-100 p-3 rounded-lg font-mono break-all">{localLink.id}</p>
      </div>
      <div className="mt-8 border-t border-gray-200 pt-6">
        <button 
          onClick={() => onDeleteLink(link.id)}
          className="w-full flex items-center justify-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 font-medium py-3 px-4 rounded-lg transition"
        >
          <DeleteIcon />
          Delete Relationship
        </button>
      </div>
    </>
  );
};

export default PropertiesPanel;
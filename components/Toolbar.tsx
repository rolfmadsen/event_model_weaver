import React, { useState, useEffect } from 'react';
import { ElementType } from '../types';
import { TriggerIcon, AddIcon, CommandIcon, EventIcon, ViewIcon, PolicyIcon, AggregateIcon } from './icons';

interface ToolbarProps {
  onAddNode: (type: ElementType) => void;
  disabled?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ onAddNode, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  // If the toolbar becomes disabled while the menu is open, close it.
  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  const tools = [
    { type: ElementType.Trigger, label: 'Trigger', icon: <TriggerIcon /> },
    { type: ElementType.Command, label: 'Command', icon: <CommandIcon /> },
    { type: ElementType.Aggregate, label: 'Aggregate', icon: <AggregateIcon /> },
    { type: ElementType.Event, label: 'Event', icon: <EventIcon /> },
    { type: ElementType.Policy, label: 'Policy', icon: <PolicyIcon /> },
    { type: ElementType.View, label: 'View', icon: <ViewIcon /> },
  ];

  const handleAddClick = (type: ElementType) => {
    onAddNode(type);
    setIsOpen(false);
  };

  return (
    <div className="absolute bottom-8 right-8 z-20 flex flex-col items-center gap-4">
      {isOpen && !disabled && (
        <div className="flex flex-col items-center gap-4 bg-white/80 backdrop-blur-sm shadow-lg rounded-full p-2">
          {tools.map((tool, index) => (
            <div key={tool.type} className="flex items-center gap-3 w-full justify-end">
              <span className="text-sm font-medium bg-gray-700 text-white py-1 px-3 rounded-md shadow-sm transition-opacity duration-300">
                {tool.label}
              </span>
              <button
                onClick={() => handleAddClick(tool.type)}
                className="w-12 h-12 bg-gray-200 hover:bg-indigo-200 text-gray-700 rounded-full flex items-center justify-center shadow-md transition-transform duration-300 ease-in-out hover:scale-110"
                title={`Add ${tool.label}`}
                style={{ transitionDelay: `${index * 30}ms` }}
              >
                {tool.icon}
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-16 h-16 text-white rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ease-in-out ${
          disabled
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-110'
        }`}
        title={disabled ? 'Connecting...' : (isOpen ? 'Close' : 'Add Element')}
      >
        <div className={`transform transition-transform duration-300 ${isOpen && !disabled ? 'rotate-45' : 'rotate-0'}`}>
            <AddIcon className="text-4xl" />
        </div>
      </button>
    </div>
  );
};

export default Toolbar;

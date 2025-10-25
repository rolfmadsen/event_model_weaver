import React, { useState, useRef } from 'react';
import { ExportIcon, ImportIcon, ViewColumnIcon } from './icons';

interface HeaderProps {
    onImport: (file: File) => void;
    onExport: () => void;
    onToggleSlices: () => void;
    slicesVisible: boolean;
}

const Header: React.FC<HeaderProps> = ({ onImport, onExport, onToggleSlices, slicesVisible }) => {
  const [buttonText, setButtonText] = useState('Share');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleShare = async () => {
    if (buttonText !== 'Share') return; 

    try {
      await navigator.clipboard.writeText(window.location.href);
      setButtonText('Copied!');
    } catch (err) {
      console.error('Failed to copy link: ', err);
      setButtonText('Error!');
    } finally {
      setTimeout(() => {
        setButtonText('Share');
      }, 2000);
    }
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
    // Reset file input to allow importing the same file again
    event.target.value = '';
  };

  return (
    <header className="absolute top-0 left-0 right-0 px-6 py-3 flex justify-between items-center z-10 bg-white shadow-md">
       <h1 className="text-xl font-bold text-gray-800 select-none">
        Event Model Weaver
       </h1>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSlices}
          className={`${slicesVisible ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-200 text-gray-700'} px-4 py-2 rounded-full hover:bg-gray-300 transition-all duration-200 flex items-center gap-2`}
          title={slicesVisible ? 'Hide Slices' : 'Show Slices'}
        >
          <ViewColumnIcon className="text-xl" />
          Slices
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        <button
          onClick={onExport}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-300 transition-all duration-200 flex items-center gap-2"
          title="Export Model as JSON"
        >
          <ExportIcon className="text-xl" />
          Export
        </button>
        <button
          onClick={handleImportClick}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-300 transition-all duration-200 flex items-center gap-2"
          title="Import Model from JSON"
        >
          <ImportIcon className="text-xl" />
          Import
        </button>
        <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        
        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        <button
          onClick={handleShare}
          className="bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-all duration-200 flex items-center gap-2 min-w-[100px] justify-center"
        >
          <span className="material-symbols-outlined text-xl">share</span>
          {buttonText}
        </button>
      </div>
    </header>
  );
};

export default Header;
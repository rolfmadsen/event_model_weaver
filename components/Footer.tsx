import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="absolute bottom-0 left-0 right-0 p-2 text-center text-xs text-gray-500 bg-gray-50/80 backdrop-blur-sm z-10 pointer-events-auto">
      <span>
        Released under the{' '}
        <a 
          href="https://github.com/rolfmadsen/event_model_weaver/blob/main/LICENSE" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline"
        >
          GNU AGPLv3 License
        </a>
        . View on{' '}
        <a 
          href="https://github.com/rolfmadsen/event_model_weaver" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline"
        >
          GitHub
        </a>
        .
      </span>
    </footer>
  );
};

export default Footer;

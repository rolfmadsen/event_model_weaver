import React from 'react';

const MaterialIcon: React.FC<{ icon: string; className?: string }> = ({ icon, className }) => (
    <span className={`material-symbols-outlined ${className}`}>{icon}</span>
);

export const CommandIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="dynamic_form" className={className} />;
export const EventIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="flash_on" className={className} />;
export const ViewIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="visibility" className={className} />;
export const TriggerIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="ads_click" className={className} />;
export const PolicyIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="hub" className={className} />;
export const AggregateIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="widgets" className={className} />;
export const AddIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="add" className={className} />;
export const CloseIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="close" className={className} />;
export const DeleteIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="delete" className={className} />;
export const ExportIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="download" className={className} />;
export const ImportIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="upload" className={className} />;
export const ViewColumnIcon: React.FC<{className?: string}> = ({className}) => <MaterialIcon icon="view_column" className={className} />;
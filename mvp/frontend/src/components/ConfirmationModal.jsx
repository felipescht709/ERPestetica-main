import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmationModal = ({
    show,
    onClose,
    onConfirm,
    title = "Confirmar Ação",
    message = "Você tem certeza que deseja prosseguir?",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    isDestructive = false // Para dar destaque a ações perigosas
}) => {
    if (!show) {
        return null;
    }

    return (
        <div className="modal-backdrop">
            <div className="modal-content confirmation-modal">
                <div className="confirmation-header">
                    <AlertTriangle size={40} className={isDestructive ? "text-red-text" : "text-yellow-text"} />
                    <h3>{title}</h3>
                </div>
                <p className="confirmation-message">{message}</p>
                <div className="modal-actions">
                    <button
                        type="button"
                        className="button-secondary"
                        onClick={onClose}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={isDestructive ? "button-danger" : "button-primary"}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
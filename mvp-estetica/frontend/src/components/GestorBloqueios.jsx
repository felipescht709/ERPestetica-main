import React, { useState } from 'react';
import api from '../utils/api';

const GestorBloqueios = ({ regras, onUpdate }) => {
    const [dataBloqueio, setDataBloqueio] = useState('');
    const [descricao, setDescricao] = useState('');

    const handleAddBloqueio = async (e) => {
        e.preventDefault();
        if (!dataBloqueio || !descricao) {
            alert("Por favor, preencha a data e a descrição.");
            return;
        }

        const payload = {
            tipo_regra: 'feriado',
            data_especifica: dataBloqueio,
            descricao: descricao,
            ativo: true,
        };

        try {
            // CORREÇÃO: Usando a sintaxe de fetch para POST
            await api('/agenda/config', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            alert('Bloqueio adicionado com sucesso!');
            setDataBloqueio('');
            setDescricao('');
            onUpdate();
        } catch (error) {
            console.error("Erro ao adicionar bloqueio:", error);
            alert(`Falha ao adicionar bloqueio: ${error.message}`);
        }
    };

    const handleDeleteBloqueio = async (id) => {
        if (!window.confirm("Tem certeza que deseja remover este bloqueio?")) {
            return;
        }
        try {
            // CORREÇÃO: Usando a sintaxe de fetch para DELETE
            await api(`/agenda/config/${id}`, { method: 'DELETE' });
            alert('Bloqueio removido com sucesso!');
            onUpdate();
        } catch (error) {
            console.error("Erro ao remover bloqueio:", error);
            alert(`Falha ao remover bloqueio: ${error.message}`);
        }
    };

    // O JSX do componente permanece o mesmo
    return (
        <div className="gestor-bloqueios-container">
            {/* ... conteúdo do componente ... */}
        </div>
    );
};

export default GestorBloqueios;
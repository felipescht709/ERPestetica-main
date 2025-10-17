const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// GET all vehicles (multi-tenant)
router.get('/', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const vehicles = await db('veiculos')
            .where({ cod_usuario_empresa: req.user.cod_usuario_empresa })
            .orderBy(['marca', 'modelo', 'placa']);
        res.json(vehicles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET vehicle by ID (multi-tenant)
router.get('/:id', authenticateToken, authorizeRole(['admin', 'gerente', 'atendente', 'tecnico']), async (req, res) => {
    try {
        const { id } = req.params;
        const vehicle = await db('veiculos')
            .where({ cod_veiculo: id, cod_usuario_empresa: req.user.cod_usuario_empresa })
            .first();

        if (!vehicle) {
            return res.status(404).json({ msg: 'Veículo não encontrado' });
        }
        res.json(vehicle);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// POST a new vehicle (multi-tenant)
router.post('/', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { marca, modelo, ano, cor, placa, chassi, renavam, quilometragem_atual, observacoes } = req.body;
    const { cod_usuario_empresa } = req.user;
    try {
        if (!marca || !modelo || !placa) {
            return res.status(400).json({ msg: 'Marca, modelo e placa são obrigatórios.' });
        }

        const plateExists = await db('veiculos')
            .where({ placa, cod_usuario_empresa })
            .first();

        if (plateExists) {
            return res.status(400).json({ msg: 'Já existe um veículo com esta placa na sua empresa.' });
        }

        const [newVehicle] = await db('veiculos')
            .insert({
                marca,
                modelo,
                ano,
                cor,
                placa,
                chassi,
                renavam,
                quilometragem_atual,
                observacoes,
                cod_usuario_empresa
            })
            .returning('*');
        
        res.status(201).json(newVehicle);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// PUT (update) a vehicle (multi-tenant)
router.put('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    const { id } = req.params;
    const { cod_usuario_empresa } = req.user;
    const { marca, modelo, ano, cor, placa, chassi, renavam, quilometragem_atual, observacoes } = req.body;

    try {
        if (placa) {
            const plateExists = await db('veiculos')
                .where({ placa, cod_usuario_empresa })
                .whereNot({ cod_veiculo: id })
                .first();

            if (plateExists) {
                return res.status(400).json({ msg: 'Já existe outro veículo com esta placa na sua empresa.' });
            }
        }

        const updateData = {};
        if (marca !== undefined) updateData.marca = marca;
        if (modelo !== undefined) updateData.modelo = modelo;
        if (ano !== undefined) updateData.ano = ano;
        if (cor !== undefined) updateData.cor = cor;
        if (placa !== undefined) updateData.placa = placa;
        if (chassi !== undefined) updateData.chassi = chassi;
        if (renavam !== undefined) updateData.renavam = renavam;
        if (quilometragem_atual !== undefined) updateData.quilometragem_atual = quilometragem_atual;
        if (observacoes !== undefined) updateData.observacoes = observacoes;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ msg: 'Nenhum campo para atualizar fornecido.' });
        }

        updateData.updated_at = db.fn.now();

        const [updatedVehicle] = await db('veiculos')
            .where({ cod_veiculo: id, cod_usuario_empresa })
            .update(updateData)
            .returning('*');

        if (!updatedVehicle) {
            return res.status(404).json({ msg: 'Veículo não encontrado' });
        }

        res.json(updatedVehicle);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// DELETE a vehicle (multi-tenant)
router.delete('/:id', authenticateToken, authorizeRole(['admin', 'gerente']), async (req, res) => {
    try {
        const { id } = req.params;
        const deletedCount = await db('veiculos')
            .where({ cod_veiculo: id, cod_usuario_empresa: req.user.cod_usuario_empresa })
            .del();

        if (deletedCount === 0) {
            return res.status(404).json({ msg: 'Veículo não encontrado' });
        }

        res.json({ msg: 'Veículo removido com sucesso' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
// routes/usuarios.js
const express = require('express');
const router = express.Router();
const pool = require('../banco');
const { authenticateToken, authorizeRole } = require('../middleware/auth'); // Importa ambos os middlewares
const bcrypt = require('bcryptjs');

// Middleware para verificar se o usuário é admin
// NOTE: Este middleware pode ser removido, e usar diretamente authorizeRole(['admin'])
// const checkAdmin = (req, res, next) => {
//     if (req.user.role !== 'admin') {
//         return res.status(403).json({ msg: 'Acesso negado. Apenas administradores.' });
//     }
//     next();
// };

// @route    GET /api/usuarios
// @desc     Listar todos os usuários (apenas para admins)
// @access   Private (Admin)
router.get('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    try {
        console.log('[USUÁRIO AUTENTICADO]', req.user);
        const result = await pool.query(
            `SELECT
                cod_usuario, nome_usuario, nome_empresa, cnpj, email, role, ativo,
                telefone_contato, logo_url, codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf,
                created_at, updated_at
            FROM usuarios
            WHERE cod_usuario_empresa = $1
            ORDER BY nome_usuario`,
            [req.user.cod_usuario_empresa]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
// @route    GET /api/usuarios/:id
// @desc     Obter usuário por ID (apenas para admins ou o próprio usuário)
// @access   Private (Admin ou próprio usuário)
router.get('/:id', authenticateToken, async (req, res) => {
    console.log('[USUÁRIO AUTENTICADO]', req.user);
    const { id } = req.params;
    // Permite que um admin veja qualquer usuário, ou o próprio usuário veja seus dados
    if (req.user.role !== 'admin' && req.user.id.toString() !== id) {
        return res.status(403).json({ msg: 'Acesso negado. Você não tem permissão para visualizar este usuário.' });
    }
    try {
        // FIX: Adicionado filtro por cod_usuario_empresa para garantir que um admin só possa ver usuários da sua própria empresa.
        const user = await pool.query(
            `SELECT
                cod_usuario, nome_usuario, nome_empresa, cnpj, email, role, ativo,
                telefone_contato, logo_url, codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf,
                created_at, updated_at
            FROM usuarios WHERE cod_usuario = $1 AND cod_usuario_empresa = $2`,
            [id, req.user.cod_usuario_empresa]
        );
        if (user.rows.length === 0) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }
        res.json(user.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    POST /api/usuarios
// @desc     Criar novo usuário (apenas para admins)
// @access   Private (Admin)
router.post('/', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    console.log('[USUÁRIO AUTENTICADO]', req.user);
    const {
        nome_usuario,
        email,
        senha,
        role,
        ativo = true, 
        telefone_contato,
        logo_url,
        codigo_ibge,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf
    } = req.body;

    // FIX: Dados da empresa devem vir do usuário admin logado, não do corpo da requisição.
    // Isso garante que o novo usuário seja criado na empresa correta.
    const { cod_usuario_empresa, nome_empresa, cnpj } = req.user;

    try {
        // 1. Validação de campos obrigatórios
        if (!nome_usuario || !email || !senha || !role) {
            return res.status(400).json({ msg: 'Por favor, preencha todos os campos obrigatórios.' });
        }
        if (!['admin', 'gerente', 'atendente', 'tecnico', 'gestor'].includes(role)) {
             return res.status(400).json({ msg: 'Role inválida fornecida.' });
        }

        // 3. Hash da senha
        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);

        // 4. Inserir novo usuário no BD com todos os campos e o cod_usuario_empresa correto
        const newUserResult = await pool.query(
            `INSERT INTO usuarios (
                nome_usuario, nome_empresa, cnpj, email, senha_hash, role, ativo,
                telefone_contato, logo_url, codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf, cod_usuario_empresa
            ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            RETURNING *`,
            [
                nome_usuario, nome_empresa, cnpj, email, senha_hash, role, ativo,
                telefone_contato, logo_url, codigo_ibge, cep, logradouro, numero, complemento, bairro, cidade, uf,
                cod_usuario_empresa
            ]
        );
        const { senha_hash: returnedSenhaHash, ...userWithoutHash } = newUserResult.rows[0];
        res.status(201).json(userWithoutHash);
    } catch (err) {
        console.error('Erro ao criar usuário:', err);
        if (err.code === '23505' && err.constraint === 'usuarios_email_key') {
            return res.status(409).json({ msg: 'Este email já está em uso.' });
        }
        res.status(500).json({ msg: 'Erro interno do servidor ao criar usuário.', error: err.message });
    }
});

// @route    PUT /api/usuarios/:id
// @desc     Atualizar dados do usuário (apenas para admins, ou o próprio usuário pode atualizar alguns de seus dados)
// @access   Private (Admin ou próprio usuário)
router.put('/:id', authenticateToken, async (req, res) => {
    console.log('[USUÁRIO AUTENTICADO]', req.user);
    const { id } = req.params;
    const {
        nome_usuario,
        nome_empresa,
        cnpj,
        email,
        role,
        ativo,
        senha, // senha será hashed
        telefone_contato,
        logo_url,
        codigo_ibge,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf
    } = req.body;

    // Lógica de autorização: Admin pode editar qualquer um, o próprio usuário só pode editar a si mesmo (e não sua role ou ativo)
    if (req.user.role !== 'admin' && req.user.id.toString() !== id) {
        return res.status(403).json({ msg: 'Acesso negado. Você não tem permissão para editar este usuário.' });
    }
    // Se não for admin e tentar mudar role, ativo, nome_empresa ou cnpj
    if (req.user.role !== 'admin' && (role !== undefined || ativo !== undefined || nome_empresa !== undefined || cnpj !== undefined)) {
        return res.status(403).json({ msg: 'Acesso negado. Você não tem permissão para alterar estes campos.' });
    }

    let query = 'UPDATE usuarios SET ';
    const params = [];
    let i = 1;

    // Adiciona campos à query de forma dinâmica
    if (nome_usuario !== undefined) { query += `nome_usuario = $${i++}, `; params.push(nome_usuario); }
    if (nome_empresa !== undefined) { query += `nome_empresa = $${i++}, `; params.push(nome_empresa); }
    if (cnpj !== undefined) { query += `cnpj = $${i++}, `; params.push(cnpj); }
    if (email !== undefined) { query += `email = $${i++}, `; params.push(email); }
    if (role !== undefined) { query += `role = $${i++}, `; params.push(role); }
    if (ativo !== undefined) { query += `ativo = $${i++}, `; params.push(ativo); }
    if (telefone_contato !== undefined) { query += `telefone_contato = $${i++}, `; params.push(telefone_contato); }
    if (logo_url !== undefined) { query += `logo_url = $${i++}, `; params.push(logo_url); }
    if (codigo_ibge !== undefined) { query += `codigo_ibge = $${i++}, `; params.push(codigo_ibge); }
    if (cep !== undefined) { query += `cep = $${i++}, `; params.push(cep); }
    if (logradouro !== undefined) { query += `logradouro = $${i++}, `; params.push(logradouro); }
    if (numero !== undefined) { query += `numero = $${i++}, `; params.push(numero); }
    if (complemento !== undefined) { query += `complemento = $${i++}, `; params.push(complemento); }
    if (bairro !== undefined) { query += `bairro = $${i++}, `; params.push(bairro); }
    if (cidade !== undefined) { query += `cidade = $${i++}, `; params.push(cidade); }
    if (uf !== undefined) { query += `uf = $${i++}, `; params.push(uf); }

    // Atualiza a senha se fornecida
    if (senha !== undefined && senha.trim() !== '') {
        const salt = await bcrypt.genSalt(10);
        const senha_hash = await bcrypt.hash(senha, salt);
        query += `senha_hash = $${i++}, `; params.push(senha_hash);
    }
    
    query += `updated_at = CURRENT_TIMESTAMP `; 

    query = query.replace(/,\s*$/, ""); 
    // FIX: Adicionado cod_usuario_empresa ao WHERE e ao array de parâmetros para garantir a segurança do tenant.
    query += ` WHERE cod_usuario = $${i++} AND cod_usuario_empresa = $${i++} RETURNING *`;
    params.push(id, req.user.cod_usuario_empresa);

    try {
        const updatedUser = await pool.query(query, params);
        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }
        // Não retornar a senha_hash
        const { senha_hash, ...userWithoutHash } = updatedUser.rows[0];
        res.json(userWithoutHash);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route    DELETE /api/usuarios/:id
// @desc     Deletar usuário (apenas para admins)
// @access   Private (Admin)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
    console.log('[USUÁRIO AUTENTICADO]', req.user);
    const { id } = req.params;
    try {
        // Evitar que um admin se auto-deleteie (opcional, mas boa prática)
        if (req.user.id.toString() === id) {
            return res.status(400).json({ msg: 'Não é possível deletar seu próprio usuário de administrador.' });
        }

        // FIX: Adicionado cod_usuario_empresa ao array de parâmetros para garantir que o admin só delete usuários da sua empresa.
        const deletedUser = await pool.query('DELETE FROM usuarios WHERE cod_usuario = $1 AND cod_usuario_empresa = $2 RETURNING *', [id, req.user.cod_usuario_empresa]);
        if (deletedUser.rows.length === 0) {
            return res.status(404).json({ msg: 'Usuário não encontrado' });
        }
        res.json({ msg: 'Usuário deletado com sucesso' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
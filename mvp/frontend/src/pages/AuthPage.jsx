// frontend/src/pages/AuthPage.jsx
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const AuthPage = () => {
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nome_usuario, setNomeUsuario] = useState('');
    const [nome_empresa, setNomeEmpresa] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [telefone_contato, setTelefoneContato] = useState('');
    const [cep, setCep] = useState('');
    const [logradouro, setLogradouro] = useState('');
    const [numero, setNumero] = useState('');
    const [complemento, setComplemento] = useState('');
    const [bairro, setBairro] = useState('');
    const [cidade, setCidade] = useState('');
    const [uf, setUf] = useState('');
    const [codigo_ibge, setCodigoIbge] = useState('');
    const [selectedRole, setSelectedRole] = useState('atendente'); // NOVO: Estado para a role selecionada
                                                                  // Default para 'atendente' para novos usuários por um admin

    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    const { login: handleAuthLogin, userRole: loggedInUserRole } = useContext(AuthContext); // Pega a role do usuário logado

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        if (!email.includes('@') || password.length < 6) {
            setMessage({ type: 'error', text: 'Email inválido ou senha muito curta (mínimo 6 caracteres).' });
            setLoading(false);
            return;
        }

        let endpoint = isRegisterMode ? '/auth/register' : '/auth/login';
        let requestBody = { email, senha: password };

        if (isRegisterMode) {
            if (!nome_usuario.trim() || !nome_empresa.trim() || !cnpj.trim()) {
                setMessage({ type: 'error', text: 'Nome de usuário, Nome da Empresa e CNPJ são campos obrigatórios para registro.' });
                setLoading(false);
                return;
            }
            requestBody = {
                ...requestBody,
                nome_usuario: nome_usuario.trim(),
                nome_empresa: nome_empresa.trim(),
                cnpj: cnpj.trim(),
                role: 'admin', // A primeira conta é sempre admin
                ativo: true,
                telefone_contato: telefone_contato.trim() || undefined,
                codigo_ibge: codigo_ibge.trim() || undefined,
                cep: cep.trim() || undefined,
                logradouro: logradouro.trim() || undefined,
                numero: numero.trim() || undefined,
                complemento: complemento.trim() || undefined,
                bairro: bairro.trim() || undefined,
                cidade: cidade.trim() || undefined,
                uf: uf.trim() || undefined,
            };
            for (const key in requestBody) {
                if (requestBody[key] === undefined || requestBody[key] === '') {
                    delete requestBody[key];
                }
            }
        }

        try {
            const data = await api(endpoint, {
                method: 'POST',
                body: JSON.stringify(requestBody),
            });

            handleAuthLogin(data.token);
            setMessage({ type: 'success', text: `Sucesso! ${isRegisterMode ? 'Conta criada.' : 'Login realizado.'}` });
        } catch (error) {
            console.error('Erro na autenticação:', error);
            // Use as classes de alerta existentes
            setMessage({ type: 'error', text: error.message || 'Ocorreu um erro. Tente novamente.' });
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = (e) => {
        e.preventDefault();
        setIsRegisterMode(!isRegisterMode);
        setMessage({ type: '', text: '' });
        setEmail('');
        setPassword('');
        setNomeUsuario('');
        setNomeEmpresa('');
        setCnpj('');
        setTelefoneContato('');
        setCep('');
        setLogradouro('');
        setNumero('');
        setComplemento('');
        setBairro('');
        setCidade('');
        setUf('');
        setCodigoIbge('');
        setSelectedRole('atendente'); // Resetar a role ao alternar modo
        setLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                {/* O título da página de AuthPage agora depende do modo e da role do usuário logado */}
                <h2 className="auth-card-title">
                    {isRegisterMode
                        ? loggedInUserRole === 'admin' ? 'Adicionar Novo Usuário' : 'Registrar Empresa'
                        : 'Login'
                    }
                </h2>
                {message.text && (
                    <div className={`auth-message ${message.type}`}> {/* Mantido auth-message */}
                        {message.text}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="auth-form">
                    {isRegisterMode && (
                        <>
                            <div className="form-group">
                                <label htmlFor="nome_usuario">Seu Nome Completo:</label>
                                <input type="text" id="nome_usuario" value={nome_usuario} onChange={(e) => setNomeUsuario(e.target.value)} required disabled={loading} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="nome_empresa">Nome da Estética/Oficina:</label>
                                <input type="text" id="nome_empresa" value={nome_empresa} onChange={(e) => setNomeEmpresa(e.target.value)} required disabled={loading} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="cnpj">CNPJ:</label>
                                <input type="text" id="cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} required disabled={loading} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="telefone_contato">Telefone de Contato (opcional):</label>
                                <input type="text" id="telefone_contato" value={telefone_contato} onChange={(e) => setTelefoneContato(e.target.value)} disabled={loading} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="cep">CEP (opcional):</label>
                                <input type="text" id="cep" value={cep} onChange={(e) => setCep(e.target.value)} disabled={loading} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="logradouro">Logradouro (opcional):</label>
                                <input type="text" id="logradouro" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} disabled={loading} className="input-field" />
                            </div>
                            <div className="form-row"> {/* Usando form-row para agrupar half-width */}
                                <div className="form-group half-width">
                                    <label htmlFor="numero">Número (opcional):</label>
                                    <input type="text" id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} disabled={loading} className="input-field" />
                                </div>
                                <div className="form-group half-width">
                                    <label htmlFor="complemento">Complemento (opcional):</label>
                                    <input type="text" id="complemento" value={complemento} onChange={(e) => setComplemento(e.target.value)} disabled={loading} className="input-field" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group half-width">
                                    <label htmlFor="bairro">Bairro (opcional):</label>
                                    <input type="text" id="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} disabled={loading} className="input-field" />
                                </div>
                                <div className="form-group half-width">
                                    <label htmlFor="cidade">Cidade (opcional):</label>
                                    <input type="text" id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} disabled={loading} className="input-field" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group half-width">
                                    <label htmlFor="uf">UF (opcional):</label>
                                    <input type="text" id="uf" maxLength="2" value={uf} onChange={(e) => setUf(e.target.value)} disabled={loading} className="input-field" />
                                </div>
                                <div className="form-group half-width">
                                    <label htmlFor="codigo_ibge">Código IBGE (opcional):</label>
                                    <input type="text" id="codigo_ibge" value={codigo_ibge} onChange={(e) => setCodigoIbge(e.target.value)} disabled={loading} className="input-field" />
                                </div>
                            </div>

                            {/* NOVO: Seleção de Role */}
                            {loggedInUserRole === 'admin' && ( // Apenas admin pode selecionar a role
                                <div className="form-group">
                                    <label htmlFor="role-select">Atribuir Role:</label>
                                    <select id="role-select" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} disabled={loading} className="input-field">
                                        <option value="admin">Administrador</option>
                                        <option value="gerente">Gerente</option>
                                        <option value="atendente">Atendente</option>
                                        <option value="tecnico">Técnico</option>
                                        {/* A role 'gestor' não deve ser selecionável aqui se 'admin' está criando outros usuários */}
                                    </select>
                                </div>
                            )}
                        </>
                    )}
                    <div className="form-group">
                        <label htmlFor="email">Email:</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} className="input-field" />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Senha:</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} className="input-field" />
                    </div>
                    <button type="submit" className="button-primary" disabled={loading}>
                        {loading ? 'Carregando...' : (isRegisterMode ? 'Registrar' : 'Entrar')}
                    </button>
                </form>
                {/* Apenas mostrar o link para alternar se não for um admin adicionando usuários */}
                {loggedInUserRole !== 'admin' && (
                    <p className="auth-switch-text">
                        {isRegisterMode ? 'Já tem uma conta?' : 'Não tem uma conta?'}
                        <a href="#" onClick={toggleMode} style={{ pointerEvents: loading ? 'none' : 'auto', opacity: loading ? '0.5' : '1' }}>
                            {isRegisterMode ? 'Login' : 'Registre-se'}
                        </a>
                    </p>
                )}
            </div>
        </div>
    );
};

export default AuthPage;

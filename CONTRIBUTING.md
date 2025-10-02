# 🤝 Guia de Contribuição

Obrigado por considerar contribuir para o **Analisador de Influenciadores do Instagram**! 

Este documento fornece diretrizes para contribuir com o projeto.

---

## 📋 Índice

- [Código de Conduta](#-código-de-conduta)
- [Como Posso Contribuir?](#-como-posso-contribuir)
- [Processo de Desenvolvimento](#-processo-de-desenvolvimento)
- [Padrões de Código](#-padrões-de-código)
- [Commits](#-commits)
- [Pull Requests](#-pull-requests)

---

## 📜 Código de Conduta

Este projeto adere a um Código de Conduta. Ao participar, você concorda em manter um ambiente respeitoso e acolhedor para todos.

---

## 🎯 Como Posso Contribuir?

### Reportar Bugs

Se encontrou um bug:

1. **Verifique** se o bug já não foi reportado nas [Issues](https://github.com/seu-repo/issues)
2. **Abra uma nova Issue** com:
   - Título claro e descritivo
   - Passos para reproduzir o problema
   - Comportamento esperado vs. comportamento atual
   - Screenshots (se aplicável)
   - Versão do Node.js e sistema operacional

### Sugerir Melhorias

Para sugerir uma nova funcionalidade:

1. **Verifique** se a sugestão já não existe nas Issues
2. **Abra uma nova Issue** com:
   - Descrição clara da funcionalidade
   - Justificativa (por que seria útil?)
   - Exemplos de uso
   - Mockups ou wireframes (se aplicável)

### Contribuir com Código

1. **Fork** o repositório
2. **Crie uma branch** para sua feature (`git checkout -b feature/MinhaFeature`)
3. **Implemente** sua mudança
4. **Teste** extensivamente
5. **Commit** suas mudanças (veja [Commits](#-commits))
6. **Push** para sua branch (`git push origin feature/MinhaFeature`)
7. **Abra um Pull Request**

### Melhorar Documentação

Documentação é crucial! Contribuições para melhorar:
- README.md
- Comentários no código
- Guias de uso
- Exemplos

São sempre bem-vindas!

---

## 🔄 Processo de Desenvolvimento

### Setup Local

```bash
# 1. Fork e clone o repositório
git clone https://github.com/SEU-USUARIO/scraper.git
cd scraper

# 2. Instale as dependências
npm install

# 3. Configure o .env
cp env.example.txt .env
# Edite o .env com suas credenciais

# 4. Inicie o servidor
npm run server
```

### Estrutura de Branches

- `main` - Código estável em produção
- `develop` - Branch de desenvolvimento
- `feature/nome-da-feature` - Novas funcionalidades
- `fix/nome-do-bug` - Correções de bugs
- `docs/nome-da-doc` - Melhorias na documentação

### Workflow

1. Sempre crie uma branch a partir de `develop`
2. Mantenha suas branches atualizadas com `develop`
3. Faça commits frequentes e descritivos
4. Teste antes de fazer push
5. Abra PR para `develop` (não para `main`)

---

## 💻 Padrões de Código

### JavaScript

```javascript
// ✅ BOM
async function scrapeProfile(username) {
  try {
    const profile = await fetchProfile(username);
    return profile;
  } catch (error) {
    console.error('[Error]', error);
    throw error;
  }
}

// ❌ EVITE
async function sp(u) {
  let p = await fp(u);
  return p;
}
```

### Nomenclatura

- **Variáveis e funções:** `camelCase`
- **Constantes:** `UPPER_SNAKE_CASE`
- **Classes:** `PascalCase`
- **Arquivos:** `kebab-case.js` ou `camelCase.js`

### Comentários

```javascript
// ✅ BOM - Comenta o "porquê"
// Delay necessário para evitar detecção do Instagram
await humanDelay(2);

// ❌ EVITE - Comenta o "o quê" (óbvio)
// Espera 2 segundos
await wait(2000);
```

### Tratamento de Erros

```javascript
// ✅ BOM
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('[Operation Error]', error.message);
  // Fallback ou re-throw
  throw new Error('Failed to complete operation');
}

// ❌ EVITE
try {
  await riskyOperation();
} catch (e) {
  // Silenciar erro sem logging
}
```

---

## 📝 Commits

### Formato

Use o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo>): <descrição curta>

<descrição detalhada (opcional)>

<footer (opcional)>
```

### Tipos

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Mudanças na documentação
- `style:` - Formatação, ponto-e-vírgula faltando, etc
- `refactor:` - Refatoração de código
- `perf:` - Melhoria de performance
- `test:` - Adição ou correção de testes
- `chore:` - Mudanças em build, CI, etc

### Exemplos

```bash
# Boa
feat(scraper): adiciona suporte para análise de Stories
fix(frontend): corrige formatação de números grandes
docs(readme): atualiza seção de instalação

# Evite
Update files
Fix bug
Changes
```

---

## 🔀 Pull Requests

### Checklist

Antes de abrir um PR, certifique-se de:

- [ ] Código segue os padrões do projeto
- [ ] Commits seguem o padrão Conventional Commits
- [ ] Código foi testado localmente
- [ ] Documentação foi atualizada (se necessário)
- [ ] Sem erros de lint
- [ ] Branch está atualizada com `develop`

### Template de PR

```markdown
## Descrição
Breve descrição do que foi alterado e por quê.

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova funcionalidade
- [ ] Breaking change
- [ ] Documentação

## Como Testar
Passos para testar as mudanças:
1. ...
2. ...

## Screenshots (se aplicável)
...

## Checklist
- [ ] Código testado
- [ ] Documentação atualizada
- [ ] Sem warnings
```

### Revisão

- PRs serão revisados por mantenedores
- Feedback será fornecido via comentários
- Mudanças podem ser solicitadas
- PRs aprovados serão mergeados para `develop`

---

## 🧪 Testes

### Testes Manuais

Antes de submeter:

```bash
# Teste com perfis diversos
npm run server

# Teste com diferentes configurações
# - Perfis públicos/privados
# - Números variados de posts
# - Com/sem imagens
```

### Verificações

- [ ] Perfil carrega corretamente
- [ ] Posts são analisados completamente
- [ ] Métricas aparecem corretamente
- [ ] Export JSON funciona
- [ ] Sem erros no console

---

## 🎉 Agradecimentos

Obrigado por contribuir! Sua ajuda torna este projeto melhor para todos. 

---

<div align="center">

**Desenvolvido Por RafaelCMSP**

[⬆️ Voltar ao topo](#-guia-de-contribuição)

</div>


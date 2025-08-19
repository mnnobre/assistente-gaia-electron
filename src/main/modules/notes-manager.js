// A linha 'require' já foi removida, o que está correto.

async function addNote(dbManager, content) {
    if (!content) {
        return { success: false, message: "Por favor, forneça o conteúdo da nota." };
    }
    // CORREÇÃO: Usa o dbManager passado como argumento
    await dbManager.notes.add(content);
    return { success: true, message: `Ok, anotei: "${content}"` };
}

async function listNotes(dbManager) {
    // CORREÇÃO: Usa o dbManager passado como argumento
    const notes = await dbManager.notes.list();
    if (notes.length === 0) {
        return { success: true, message: "Você ainda não tem nenhuma nota." };
    }
    const formattedNotes = notes.map(n => `[ID: ${n.id}] - ${n.content}`).join('\n');
    return { success: true, message: `Aqui estão suas notas:\n\n${formattedNotes}` };
}

async function clearNotes(dbManager) {
    // CORREÇÃO: Usa o dbManager passado como argumento
    await dbManager.notes.clear();
    return { success: true, message: "Ok, todas as suas notas foram apagadas." };
}

async function deleteNote(dbManager, id) {
    if (!id || isNaN(id)) {
        return { success: false, message: "Por favor, diga o ID da nota que quer deletar." };
    }
    // CORREÇÃO: Usa o dbManager passado como argumento
    const changes = await dbManager.notes.delete(id);
    return { 
        success: true, 
        message: changes > 0 
            ? `Pronto! A nota ID ${id} foi deletada.` 
            : `Não encontrei nenhuma nota com o ID ${id}.` 
    };
}

module.exports = {
    addNote,
    listNotes,
    clearNotes,
    deleteNote,
};
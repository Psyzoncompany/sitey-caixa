const { createRoot } = window.ReactDOM;

const IAChat = window.IAChat;

// Esconder o botão do Gemini chat antigo (gemini-chat.js) se houver
const oldFab = document.getElementById('gemini-chat-fab');
if (oldFab) {
    oldFab.style.display = 'none';
    oldFab.classList.add('hidden');
}
const oldModal = document.getElementById('gemini-chat-modal');
if (oldModal) {
    oldModal.style.display = 'none';
    oldModal.classList.add('hidden');
}

// Create container for the new React app
let container = document.getElementById('react-ia-chat-root');
if (!container) {
    container = document.createElement('div');
    container.id = 'react-ia-chat-root';
    document.body.appendChild(container);
}

const root = createRoot(container);
root.render(
    <window.React.StrictMode>
        <AppContainer />
    </window.React.StrictMode>
);

// Componente que gerencia o FAB (botão flutuante) e o Chat
function AppContainer() {
    const [isOpen, setIsOpen] = window.React.useState(false);

    return (
        <>
            {/* The Floating Action Button */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00f5a0, #00d9f5)',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0, 245, 160, 0.4)',
                    cursor: 'pointer',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    transition: 'transform 0.2s',
                    transform: isOpen ? 'scale(0.9)' : 'scale(1)',
                }}
            >
                {isOpen ? '✕' : '🧠'}
            </button>

            {/* The Chat Window */}
            <div
                style={{
                    position: 'fixed',
                    bottom: '100px',
                    right: '24px',
                    width: 'min(90vw, 400px)',
                    height: 'min(80vh, 700px)',
                    zIndex: 99998,
                    display: isOpen ? 'flex' : 'none',
                    flexDirection: 'column',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                }}
            >
                {/* Reset local styles within chat so it doesn't conflict with global */}
                <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <IAChat />
                </div>
            </div>
        </>
    );
}

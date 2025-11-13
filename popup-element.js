class PopupElement extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        const template = `
            <style>
                .popup-content {
                    display: none;
                    background: #adadad;
                    padding: 20px;
                    border-radius: 5px;
                    text-align: center;
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    min-width: 300px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                    z-index: 1000;
                }
                .popup-content button {
                    background: #4a4a4a;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .popup-content button:hover {
                    background: #353535;
                }

                /* style projected light-DOM elements (input, button, canvas) */
                ::slotted(button) {
                    background: #f8f8f8;
                    border: 1px solid #e0e0e0;
                    padding: 0.85rem 1.75rem;
                    border-radius: 50px;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                ::slotted(button:hover) {
                    background: #fff;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                ::slotted(input) {
                    padding: 0.5rem 0.75rem;
                    font-size: 0.95rem;
                    border: 1px solid #ccc;
                    border-radius: 6px;
                }
                ::slotted(canvas) {
                    max-width: 100%;
                    height: auto;
                    display: block;
                    margin: 1rem auto;
                }
            </style>
            <div class="popup-content">
                <slot></slot>
                <button class="close-button">Close</button>
            </div>
        `;
        
        this.shadowRoot.innerHTML = template;
        this.popup = this.shadowRoot.querySelector('.popup-content');
        this.closeButton = this.shadowRoot.querySelector('.close-button');
        
        this.closeButton.addEventListener('click', () => this.hide());
    }
    
    show() {
        this.popup.style.display = 'block';
    }
    
    hide() {
        this.popup.style.display = 'none';
    }
}

customElements.define('custom-popup', PopupElement);
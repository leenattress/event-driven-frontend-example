import ToDoApi from './ToDoApi.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');
    const todoList = document.getElementById('todo-list');
    const todoInput = document.getElementById('todo-input');
    const todoApi = new ToDoApi();
    const exampleTodos = [
        'Buy groceries',
        'Read a book',
        'Walk the dog',
        'Call mom',
        'Finish homework',
        'Dance in the rain',
        'Sing to the plants',
        'Write a letter to future self',
        'Build a pillow fort',
        'Have a staring contest with the mirror'
    ];

    const randomExample = exampleTodos[Math.floor(Math.random() * exampleTodos.length)];
    todoInput.value = randomExample;

    initializeTodos();
    setupAddTodoButton();

    const socket = new WebSocket('ws://localhost:7687');

    socket.addEventListener('open', () => {
        console.log('Connected to WebSocket server');
    });

    socket.addEventListener('message', (event) => {
        console.log('Received data from WebSocket:', event.data);
        const { verb, payload } = JSON.parse(event.data);

        if (payload.id) {
            let listItem = document.querySelector(`.todo-item[data-id='${payload.id}']`);
            if (listItem) {
                if (verb === 'create' || verb === 'update') {
                    listItem.classList.remove('saving');
                    const spinner = listItem.querySelector('.spinner');
                    if (spinner) spinner.remove();
                    if (!listItem.querySelector('button')) {
                        const deleteButton = createDeleteButton(listItem);
                        listItem.append(deleteButton);
                    }
                } else if (verb === 'delete') {
                    listItem.remove();
                }
            } else {
                if (verb === 'create') {
                    renderTodoItem(payload);
                } else if (verb === 'update') {
                    renderTodoItem(payload);
                } else if (verb === 'delete') {
                    const listItemToDelete = document.querySelector(`.todo-item[data-id='${payload.id}']`);
                    if (listItemToDelete) {
                        listItemToDelete.remove();
                    }
                }
            }
        }
    });

    socket.addEventListener('close', () => {
        console.log('Disconnected from WebSocket server');
    });

    function initializeTodos() {
        showSkeletons(3);
        todoApi.getTodos()
            .then(todos => {
                clearSkeletons();
                if (todos.length === 0) {
                    showNoTodosMessage();
                } else {
                    todos.forEach(todo => renderTodoItem(todo));
                }
            })
            .catch(error => {
                console.error('Error loading todos:', error);
                clearSkeletons();
            });
    }

    function showSkeletons(count) {
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('li');
            skeleton.className = 'skeleton';
            skeleton.textContent = 'Loading...';
            todoList.append(skeleton);
        }
    }

    function clearSkeletons() {
        const skeletons = document.querySelectorAll('.skeleton');
        skeletons.forEach(skeleton => skeleton.remove());
    }

    function showNoTodosMessage() {
        const noTodosMessage = document.createElement('li');
        noTodosMessage.className = 'no-todos';
        noTodosMessage.textContent = 'No todos available. Add a new one!';
        todoList.append(noTodosMessage);
    }

    function setupAddTodoButton() {
        document.getElementById('add-todo').addEventListener('click', () => {
            const todoText = todoInput.value.trim();
            if (todoText) {
                addTodoWithApi(todoText);
                todoInput.value = '';
                const newRandomExample = exampleTodos[Math.floor(Math.random() * exampleTodos.length)];
                todoInput.value = newRandomExample;
            }
        });
    }

    function addTodoWithApi(todoText) {
        const tempTodo = { id: Date.now(), text: todoText, completed: false };
        renderTodoItem(tempTodo, true);
        const listItem = document.querySelector(`.todo-item[data-id='${tempTodo.id}']`);

        todoApi.addTodo({ text: todoText })
            .then(todo => {
                listItem.dataset.id = todo.id;
            })
            .catch(error => {
                console.error('API call failed for:', todoText, error);
                listItem.classList.remove('saving');
                listItem.classList.add('error');
            });
    }

    function createSkeletonItem() {
        const skeleton = document.createElement('li');
        skeleton.className = 'skeleton';
        skeleton.textContent = 'Loading...';
        todoList.prepend(skeleton);
        return skeleton;
    }

    function renderTodoItem(todo, isNew = false) {
        const listItem = document.createElement('li');
        listItem.className = 'todo-item';
        listItem.dataset.id = todo.id;

        const textSpan = createTextSpan(todo.text);

        listItem.append(textSpan);

        if (isNew) {
            const spinner = createSpinner();
            listItem.append(spinner);
            listItem.classList.add('saving');
        } else {
            const deleteButton = createDeleteButton(listItem);
            listItem.append(deleteButton);
        }

        todoList.prepend(listItem);
    }

    function createTextSpan(text) {
        const textSpan = document.createElement('span');
        textSpan.className = 'todo-text';
        textSpan.textContent = text;
        return textSpan;
    }

    function createDeleteButton(listItem) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => handleDelete(listItem, deleteButton));
        return deleteButton;
    }

    function handleDelete(listItem, deleteButton) {
        const originalText = listItem.querySelector('.todo-text').textContent;
        const todoId = listItem.dataset.id;

        // Change button to spinner
        deleteButton.textContent = '';
        deleteButton.classList.add('spinner');

        todoApi.deleteTodo(todoId)
            .then(success => {
                if (success) {
                    listItem.remove();
                    if (todoList.children.length === 0) {
                        showNoTodosMessage();
                    }
                } else {
                    throw new Error('Delete failed');
                }
            })
            .catch(error => {
                console.error('Delete failed for:', originalText, error);
                showToast(`Failed to delete "${originalText}". Please try again.`);
                // Revert spinner back to delete button on error
                deleteButton.textContent = 'Delete';
                deleteButton.classList.remove('spinner');
            });
    }

    function removeNoTodosMessage() {
        const noTodosMessage = document.querySelector('.no-todos');
        if (noTodosMessage) {
            noTodosMessage.remove();
        }
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        const closeButton = document.createElement('button');
        closeButton.textContent = 'x';
        closeButton.onclick = () => toast.remove();
        toast.append(closeButton);
        document.body.append(toast);
    }

    function updateTodoList(todos) {
        todoList.innerHTML = '';
        todos.forEach(todo => renderTodoItem(todo));
    }

    function createSpinner() {
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        spinner.textContent = '⏳'; // Simple text spinner
        return spinner;
    }
}); 
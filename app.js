// app.js
import { supabase } from './supabase-config.js';

// Current user state
let currentUser = null;

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;
    return user;
}

export async function signOut() {
    await supabase.auth.signOut();
}

export async function loadProfile(userId) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (profile) {
        const summary = document.getElementById('profileSummary');
        if (summary) {
            summary.innerHTML = `
                <img src="${profile.display_picture || 'default-avatar.png'}" class="profile-avatar">
                <h3>${profile.username}</h3>
                <p>SSN: ${profile.ssn}</p>
                <div class="stats">
                    <span>${profile.followers_count} Followers</span>
                    <span>${profile.following_count} Following</span>
                </div>
                <button id="editProfileBtn" class="glass-btn small">Edit</button>
            `;
        }
    }
}

// Feed realtime
export function initRealtimeFeed() {
    const postsContainer = document.getElementById('postsContainer');
    if (!postsContainer) return;

    async function loadPosts() {
        const { data } = await supabase
            .from('posts')
            .select('*, profiles(username, display_picture)')
            .order('created_at', { ascending: false });
        postsContainer.innerHTML = '';
        data?.forEach(post => renderPost(post, postsContainer));
    }

    loadPosts();

    supabase
        .channel('posts-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, loadPosts)
        .subscribe();
}

export function renderPost(post, container) {
    const div = document.createElement('div');
    div.className = 'post glass';
    div.innerHTML = `
        <div class="post-header">
            <img src="${post.profiles.display_picture || 'default-avatar.png'}" class="avatar">
            <strong>${post.profiles.username}</strong>
            <small>${new Date(post.created_at).toLocaleString()}</small>
        </div>
        <div class="post-content">${post.content}</div>
        ${post.media_url ? `<img src="${supabase.storage.from('posts').getPublicUrl(post.media_url).publicUrl}" class="post-media">` : ''}
        <div class="post-actions">
            <button class="like-btn" data-id="${post.id}">❤️ ${post.likes_count}</button>
            <button class="comment-btn" data-id="${post.id}">💬 ${post.comments_count}</button>
            ${post.user_id === currentUser?.id ? `<button class="delete-btn" data-id="${post.id}">🗑️</button>` : ''}
        </div>
    `;
    container.appendChild(div);
}

// Contacts
export function loadContacts() {
    const contactsList = document.getElementById('contactsList');
    if (!contactsList) return;
    const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
    contactsList.innerHTML = '';
    contacts.forEach(contact => {
        const item = document.createElement('div');
        item.className = 'contact-item';
        item.dataset.userId = contact.user_id;
        item.innerHTML = `<strong>${contact.username}</strong><br><small>${contact.ssn}</small>`;
        item.addEventListener('click', () => selectContact(contact));
        contactsList.appendChild(item);
    });
}

let activeContact = null;
function selectContact(contact) {
    activeContact = contact;
    document.getElementById('chatHeader').innerText = contact.username;
    loadMessages(contact.user_id);
}

async function loadMessages(otherUserId) {
    const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${currentUser.id},recipient_id.eq.${currentUser.id}`)
        .or(`sender_id.eq.${otherUserId},recipient_id.eq.${otherUserId}`)
        .order('created_at');
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    data.forEach(msg => {
        const div = document.createElement('div');
        div.className = `message ${msg.sender_id === currentUser.id ? 'own' : ''}`;
        div.innerText = msg.content;
        container.appendChild(div);
    });
}

export function initChat() {
    document.getElementById('sendMessageBtn').addEventListener('click', async () => {
        if (!activeContact) return;
        const text = document.getElementById('messageText').value;
        if (!text.trim()) return;
        await supabase.from('direct_messages').insert({
            sender_id: currentUser.id,
            recipient_id: activeContact.user_id,
            content: text
        });
        document.getElementById('messageText').value = '';
        loadMessages(activeContact.user_id);
    });

    // realtime
    supabase
        .channel('dms')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, payload => {
            if (activeContact && (payload.new.sender_id === activeContact.user_id || payload.new.recipient_id === activeContact.user_id)) {
                loadMessages(activeContact.user_id);
            }
        })
        .subscribe();
}

// Groups (simplified)
export async function loadGroups() {
    const { data } = await supabase
        .from('group_members')
        .select('groups(*)')
        .eq('user_id', currentUser.id);
    const list = document.getElementById('groupsList');
    list.innerHTML = '';
    data?.forEach(m => {
        const div = document.createElement('div');
        div.className = 'contact-item';
        div.dataset.groupId = m.groups.id;
        div.innerText = m.groups.name;
        div.addEventListener('click', () => selectGroup(m.groups));
        list.appendChild(div);
    });
}

let activeGroup = null;
function selectGroup(group) {
    activeGroup = group;
    document.getElementById('groupHeader').innerText = group.name;
    document.getElementById('groupInputArea').style.display = 'flex';
    loadGroupMessages(group.id);
}

async function loadGroupMessages(groupId) {
    const { data } = await supabase
        .from('group_messages')
        .select('*, profiles(username)')
        .eq('group_id', groupId)
        .order('created_at');
    const container = document.getElementById('groupMessages');
    container.innerHTML = '';
    data?.forEach(msg => {
        const div = document.createElement('div');
        div.className = `message ${msg.user_id === currentUser.id ? 'own' : ''}`;
        div.innerHTML = `<strong>${msg.profiles.username}</strong>: ${msg.content}`;
        container.appendChild(div);
    });
}

export function initGroupChat() {
    document.getElementById('sendGroupMessage').addEventListener('click', async () => {
        if (!activeGroup) return;
        const text = document.getElementById('groupMessageText').value;
        if (!text.trim()) return;
        await supabase.from('group_messages').insert({
            group_id: activeGroup.id,
            user_id: currentUser.id,
            content: text
        });
        document.getElementById('groupMessageText').value = '';
        loadGroupMessages(activeGroup.id);
    });

    supabase
        .channel('group-messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, payload => {
            if (activeGroup && payload.new.group_id === activeGroup.id) {
                loadGroupMessages(activeGroup.id);
            }
        })
        .subscribe();
      }

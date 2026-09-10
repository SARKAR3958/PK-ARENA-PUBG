import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Users, Plus, Key, Copy, Check, Trash2, UserX, 
  Send, Crown, Shield, Edit3, LogOut, MessageSquare, 
  AlertTriangle, UserPlus, Info, CheckCircle2, ChevronRight, X,
  Settings, UserCheck, Search, Bell, Eraser, Upload, Image as ImageIcon
} from 'lucide-react';
import { ref, onValue, set, push, remove, update, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { Team, TeamMember, TeamChatMessage, TeamInvite } from '../types';
import toast from 'react-hot-toast';
import { PK_COIN_ICON, PK_LOGO_IMAGE, DEFAULT_AVATAR } from '../lib/assets';
import { compressImage } from '../lib/imageUtils';

interface TeamsScreenProps {
  onClose: () => void;
  initialTeamId?: string | null;
}

export function TeamsScreen({ onClose, initialTeamId }: TeamsScreenProps) {
  const { currentUser, t, appSettings } = useApp();
  
  // View states
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Top action modal/tab: 'NONE' | 'CREATE' | 'JOIN' | 'REQUESTS'
  const [activeAction, setActiveAction] = useState<'NONE' | 'CREATE' | 'JOIN' | 'REQUESTS'>('NONE');
  
  // Forms state
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Join Requests / Invites for the current user
  const [joinRequests, setJoinRequests] = useState<TeamInvite[]>([]);
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);

  // Incoming Join Requests for the selected team (Captain view)
  const [incomingTeamRequests, setIncomingTeamRequests] = useState<TeamInvite[]>([]);

  // Modals & Drawers
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Registered users for inviting
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [sentInvitesMap, setSentInvitesMap] = useState<Record<string, boolean>>({});

  // Edit Team Name
  const [editNameInput, setEditNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUpdatingLogo, setIsUpdatingLogo] = useState(false);

  // Clear chat state
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);

  // Kick confirm modal
  const [memberToKick, setMemberToKick] = useState<TeamMember | null>(null);

  // Delete team confirm modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Leave team confirm modal
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Chat states
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Listen to all teams in RTDB and filter user's teams
  useEffect(() => {
    if (!currentUser?.uid) return;

    const teamsRef = ref(db, 'teams');
    const unsubscribe = onValue(teamsRef, (snapshot) => {
      setLoading(false);
      if (!snapshot.exists()) {
        setUserTeams([]);
        if (selectedTeam) {
          setSelectedTeam(null);
        }
        return;
      }

      const data = snapshot.val();
      const list: Team[] = [];
      Object.keys(data).forEach((key) => {
        const item = data[key];
        if (!item) return;
        const members = item.members || {};
        const isMember = members[currentUser.uid] !== undefined;
        const isCaptain = item.captainUid === currentUser.uid;

        if (isMember || isCaptain) {
          list.push({
            id: key,
            name: item.name || 'Team',
            code: item.code || '',
            captainUid: item.captainUid || '',
            captainName: item.captainName || 'Captain',
            captainAvatar: item.captainAvatar || '',
            logoUrl: item.logoUrl || '',
            createdAt: item.createdAt || Date.now(),
            members: members,
            updatedAt: item.updatedAt
          });
        }
      });

      // Sort recent first
      list.sort((a, b) => {
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || 0).getTime() || 0;
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || 0).getTime() || 0;
        return timeB - timeA;
      });
      setUserTeams(list);

      // Initial select if initialTeamId provided
      if (initialTeamId) {
        const found = list.find((t) => t.id === initialTeamId);
        if (found) setSelectedTeam(found);
      }
    });

    return () => unsubscribe();
  }, [currentUser?.uid, initialTeamId]);

  // Dedicated Realtime Selected Team Listener: Instant Kick & Live Updates
  useEffect(() => {
    if (!selectedTeam?.id || !currentUser?.uid) return;

    const currentTeamId = selectedTeam.id;
    const teamRef = ref(db, `teams/${currentTeamId}`);
    
    const unsubscribe = onValue(teamRef, (snapshot) => {
      if (!snapshot.exists()) {
        // Squad was deleted by Captain
        setSelectedTeam(null);
        setMessages([]);
        setShowMembersModal(false);
        setShowSettingsModal(false);
        setShowAddMemberModal(false);
        toast.error('This squad was deleted by the Captain.');
        return;
      }

      const val = snapshot.val();
      const isCaptain = val.captainUid === currentUser.uid;
      const members = val.members || {};
      const isMember = members[currentUser.uid] !== undefined;

      // If user was removed/kicked by Captain
      if (!isCaptain && !isMember) {
        setSelectedTeam(null);
        setMessages([]);
        setShowMembersModal(false);
        setShowSettingsModal(false);
        setShowAddMemberModal(false);
        toast.error('You were removed from this squad by the Captain.');
        return;
      }

      // Keep selectedTeam synced in real-time
      setSelectedTeam((prev) => {
        if (!prev || prev.id !== currentTeamId) return prev;
        return {
          id: currentTeamId,
          name: val.name || 'Team',
          code: val.code || '',
          captainUid: val.captainUid || '',
          captainName: val.captainName || 'Captain',
          captainAvatar: val.captainAvatar || '',
          logoUrl: val.logoUrl || '',
          createdAt: val.createdAt || Date.now(),
          members: members,
          updatedAt: val.updatedAt
        };
      });
    });

    return () => unsubscribe();
  }, [selectedTeam?.id, currentUser?.uid]);

  // Listen to pending join requests / invitations for this user
  useEffect(() => {
    if (!currentUser?.uid) return;

    const invitesRef = ref(db, 'teamInvites');
    const unsubscribe = onValue(invitesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setJoinRequests([]);
        return;
      }

      const data = snapshot.val();
      const list: TeamInvite[] = [];
      Object.keys(data).forEach((key) => {
        const item = data[key];
        if (item && item.invitedUid === currentUser.uid && item.status === 'pending') {
          list.push({
            id: key,
            type: item.type || 'invite',
            teamId: item.teamId,
            teamName: item.teamName || 'Squad',
            teamCode: item.teamCode || '',
            captainUid: item.captainUid,
            captainName: item.captainName || 'Captain',
            captainAvatar: item.captainAvatar || '',
            invitedUid: item.invitedUid,
            invitedUsername: item.invitedUsername || '',
            invitedAvatar: item.invitedAvatar || '',
            invitedInGameName: item.invitedInGameName || '',
            status: item.status || 'pending',
            createdAt: item.createdAt || Date.now()
          });
        }
      });

      list.sort((a, b) => b.createdAt - a.createdAt);
      setJoinRequests(list);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Listen to incoming join requests for selected team (Captain view)
  useEffect(() => {
    if (!selectedTeam?.id) {
      setIncomingTeamRequests([]);
      return;
    }

    const invitesRef = ref(db, 'teamInvites');
    const unsubscribe = onValue(invitesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setIncomingTeamRequests([]);
        return;
      }

      const data = snapshot.val();
      const list: TeamInvite[] = [];
      Object.keys(data).forEach((key) => {
        const item = data[key];
        if (
          item &&
          item.teamId === selectedTeam.id &&
          item.type === 'request' &&
          item.status === 'pending'
        ) {
          list.push({
            id: key,
            type: 'request',
            teamId: item.teamId,
            teamName: item.teamName || selectedTeam.name,
            teamCode: item.teamCode || selectedTeam.code,
            captainUid: item.captainUid,
            captainName: item.captainName || selectedTeam.captainName,
            captainAvatar: item.captainAvatar || '',
            invitedUid: item.invitedUid,
            invitedUsername: item.invitedUsername || 'Player',
            invitedAvatar: item.invitedAvatar || '',
            invitedInGameName: item.invitedInGameName || '',
            status: item.status || 'pending',
            createdAt: item.createdAt || Date.now()
          });
        }
      });

      list.sort((a, b) => b.createdAt - a.createdAt);
      setIncomingTeamRequests(list);
    });

    return () => unsubscribe();
  }, [selectedTeam?.id]);

  // Listen to sent invites for selected team to show "Invite Sent" in Add Member modal
  useEffect(() => {
    if (!selectedTeam?.id) {
      setSentInvitesMap({});
      return;
    }

    const invitesRef = ref(db, 'teamInvites');
    const unsubscribe = onValue(invitesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setSentInvitesMap({});
        return;
      }

      const data = snapshot.val();
      const map: Record<string, boolean> = {};
      Object.keys(data).forEach((key) => {
        const item = data[key];
        if (item && item.teamId === selectedTeam.id && item.status === 'pending') {
          map[item.invitedUid] = true;
        }
      });
      setSentInvitesMap(map);
    });

    return () => unsubscribe();
  }, [selectedTeam?.id]);

  // Listen to chat messages when selectedTeam changes
  useEffect(() => {
    if (!selectedTeam?.id) {
      setMessages([]);
      return;
    }

    const chatRef = ref(db, `teamChats/${selectedTeam.id}/messages`);
    const unsubscribe = onValue(chatRef, (snapshot) => {
      if (!snapshot.exists()) {
        setMessages([]);
        return;
      }
      const data = snapshot.val();
      const msgList: TeamChatMessage[] = [];
      Object.keys(data).forEach((key) => {
        const item = data[key];
        if (item) {
          msgList.push({
            id: key,
            teamId: selectedTeam.id,
            senderUid: item.senderUid,
            senderName: item.senderName || 'Member',
            senderAvatar: item.senderAvatar || '',
            senderRole: item.senderRole || 'Player',
            text: item.text || '',
            timestamp: item.timestamp || Date.now(),
            isSystem: !!item.isSystem
          });
        }
      });

      msgList.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(msgList);
    });

    return () => unsubscribe();
  }, [selectedTeam?.id]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (selectedTeam && messages.length > 0) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, selectedTeam]);

  // Helper to generate a unique 6-character team code starting with 'PK'
  const generatePK6DigitCode = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    return `PK${randomDigits}`;
  };

  // LOGO UPLOAD
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingToast = toast.loading('Processing logo...');
    setIsUploadingLogo(true);

    try {
      // Compress image
      const compressedBlob = await compressImage(file, 400, 400, 0.6);
      
      const formData = new FormData();
      formData.append('image', compressedBlob, 'logo.jpg');
      
      toast.loading('Uploading logo...', { id: loadingToast });

      const apiKey = appSettings?.imgbbApiKey?.trim() || import.meta.env.VITE_IMGBB_API_KEY || '29348d4d4bf16a193ea8df02d632bf96';
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        const imageUrl = result.data.url;
        setNewTeamLogo(imageUrl);
        toast.dismiss(loadingToast);
        toast.success('Logo uploaded successfully!');
      } else {
        throw new Error(result.error?.message || 'Failed to upload logo to ImgBB');
      }
    } catch (err: any) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error(err.message || 'Error uploading logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // CREATE TEAM
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return toast.error('Please login first');

    const cleanName = newTeamName.trim();
    if (!cleanName || cleanName.length < 2) {
      return toast.error('Team name must be at least 2 characters.');
    }
    if (cleanName.length > 25) {
      return toast.error('Team name cannot exceed 25 characters.');
    }

    setIsSubmitting(true);
    try {
      const code = generatePK6DigitCode();
      const newTeamRef = push(ref(db, 'teams'));
      const teamId = newTeamRef.key;

      if (!teamId) throw new Error('Failed to generate team key');

      const captainMember: TeamMember = {
        uid: currentUser.uid,
        username: currentUser.username || 'Captain',
        inGameName: currentUser.inGameName || '',
        avatarUrl: currentUser.avatarUrl || DEFAULT_AVATAR,
        role: 'Captain',
        joinedAt: Date.now()
      };

      const newTeamData = {
        name: cleanName,
        code: code,
        captainUid: currentUser.uid,
        captainName: currentUser.username || 'Captain',
        captainAvatar: currentUser.avatarUrl || DEFAULT_AVATAR,
        logoUrl: newTeamLogo || '',
        createdAt: Date.now(),
        members: {
          [currentUser.uid]: captainMember
        }
      };

      await set(ref(db, `teams/${teamId}`), newTeamData);

      // Add system welcome message
      await push(ref(db, `teamChats/${teamId}/messages`), {
        senderUid: 'system',
        senderName: 'SYSTEM',
        text: `Team "${cleanName}" created! Squad join code: ${code}. Share this 6-character code with teammates to join.`,
        timestamp: Date.now(),
        isSystem: true
      });

      toast.success(`Team "${cleanName}" created successfully!`);
      setNewTeamName('');
      setNewTeamLogo('');
      setActiveAction('NONE');

      // Auto select the new team
      setSelectedTeam({
        id: teamId,
        ...newTeamData
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  };

  // JOIN TEAM WITH CODE (Sends Join Request to Captain)
  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return toast.error('Please login first');

    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      return toast.error('Please enter a valid 6-character team code (e.g. PK4920).');
    }

    setIsSubmitting(true);
    try {
      const teamsSnap = await get(ref(db, 'teams'));
      if (!teamsSnap.exists()) {
        throw new Error('No team found with this code.');
      }

      const allTeams = teamsSnap.val();
      let targetTeamId: string | null = null;
      let targetTeam: any = null;

      for (const key of Object.keys(allTeams)) {
        const teamCode = allTeams[key]?.code?.toString().toUpperCase();
        if (teamCode === cleanCode) {
          targetTeamId = key;
          targetTeam = allTeams[key];
          break;
        }
      }

      if (!targetTeamId || !targetTeam) {
        throw new Error('No team found with this code.');
      }

      const currentMembers: Record<string, TeamMember> = targetTeam.members || {};
      const memberKeys = Object.keys(currentMembers);

      // Check if already in this team
      if (currentMembers[currentUser.uid]) {
        toast('You are already a member of this team.', { icon: 'ℹ️' });
        setActiveAction('NONE');
        setJoinCode('');
        setSelectedTeam({
          id: targetTeamId,
          ...targetTeam
        });
        return;
      }

      // Max 6 players in squad (Captain + 5 Members / Total 6)
      if (memberKeys.length >= 6) {
        throw new Error('This squad is already full (Squad limit: Captain + 5 Members / 6 Players Max).');
      }

      // Check if user already submitted a pending join request to this team
      const invitesSnap = await get(ref(db, 'teamInvites'));
      if (invitesSnap.exists()) {
        const allInvites = invitesSnap.val();
        for (const k of Object.keys(allInvites)) {
          const inv = allInvites[k];
          if (
            inv &&
            inv.teamId === targetTeamId &&
            inv.invitedUid === currentUser.uid &&
            inv.status === 'pending'
          ) {
            throw new Error(`You already have a pending join request for "${targetTeam.name}". Waiting for Captain's approval.`);
          }
        }
      }

      // Create Join Request for Team Captain to approve
      const inviteRef = push(ref(db, 'teamInvites'));
      await set(inviteRef, {
        type: 'request',
        teamId: targetTeamId,
        teamName: targetTeam.name,
        teamCode: targetTeam.code,
        captainUid: targetTeam.captainUid,
        captainName: targetTeam.captainName || 'Captain',
        captainAvatar: targetTeam.captainAvatar || '',
        invitedUid: currentUser.uid,
        invitedUsername: currentUser.username || 'Player',
        invitedInGameName: currentUser.inGameName || '',
        invitedAvatar: currentUser.avatarUrl || DEFAULT_AVATAR,
        status: 'pending',
        createdAt: Date.now()
      });

      toast.success(`Join request sent to Captain of "${targetTeam.name}"! You will join when the Captain accepts.`);
      setJoinCode('');
      setActiveAction('NONE');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to send join request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // CAPTAIN: ACCEPT JOIN REQUEST (From Team Code)
  const handleCaptainAcceptRequest = async (request: TeamInvite) => {
    if (!selectedTeam || !currentUser?.uid) return;
    if (selectedTeam.captainUid !== currentUser.uid) {
      return toast.error('Only the Team Captain can accept join requests.');
    }

    setProcessingInviteId(request.id);
    try {
      // 1. Get latest team data
      const teamSnap = await get(ref(db, `teams/${selectedTeam.id}`));
      if (!teamSnap.exists()) {
        await remove(ref(db, `teamInvites/${request.id}`));
        throw new Error('Team no longer exists.');
      }

      const teamData = teamSnap.val();
      const currentMembers: Record<string, TeamMember> = teamData.members || {};
      const memberKeys = Object.keys(currentMembers);

      if (memberKeys.length >= 6) {
        throw new Error('Squad is already full (Max 6 players / Captain + 5 Members).');
      }

      if (currentMembers[request.invitedUid]) {
        await remove(ref(db, `teamInvites/${request.id}`));
        throw new Error(`${request.invitedUsername} is already a member of this squad.`);
      }

      // Check next role
      const assignedRoles = Object.values(currentMembers).map((m: any) => m.role);
      let nextRole: TeamMember['role'] = 'Player 2';
      for (let i = 2; i <= 6; i++) {
        const r = `Player ${i}`;
        if (!assignedRoles.includes(r)) {
          nextRole = r;
          break;
        }
      }

      const newMember: TeamMember = {
        uid: request.invitedUid,
        username: request.invitedUsername || 'Player',
        inGameName: request.invitedInGameName || '',
        avatarUrl: request.invitedAvatar || '',
        role: nextRole,
        joinedAt: Date.now()
      };

      // Add to team members
      await update(ref(db, `teams/${selectedTeam.id}/members`), {
        [request.invitedUid]: newMember
      });

      // Remove the join request
      await remove(ref(db, `teamInvites/${request.id}`));

      // Post system announcement in team chat
      await push(ref(db, `teamChats/${selectedTeam.id}/messages`), {
        senderUid: 'system',
        senderName: 'SYSTEM',
        text: `👑 Captain accepted ${request.invitedUsername}'s request to join the squad as ${nextRole}!`,
        timestamp: Date.now(),
        isSystem: true
      });

      toast.success(`Accepted ${request.invitedUsername} into the squad!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to accept join request');
    } finally {
      setProcessingInviteId(null);
    }
  };

  // CAPTAIN: REJECT JOIN REQUEST
  const handleCaptainRejectRequest = async (requestId: string, username: string) => {
    if (!selectedTeam || !currentUser?.uid) return;
    if (selectedTeam.captainUid !== currentUser.uid) {
      return toast.error('Only the Team Captain can reject join requests.');
    }

    setProcessingInviteId(requestId);
    try {
      await remove(ref(db, `teamInvites/${requestId}`));
      toast.success(`Declined join request from ${username}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to decline join request');
    } finally {
      setProcessingInviteId(null);
    }
  };

  // USER: CANCEL SENT JOIN REQUEST
  const handleCancelJoinRequest = async (inviteId: string) => {
    setProcessingInviteId(inviteId);
    try {
      await remove(ref(db, `teamInvites/${inviteId}`));
      toast.success('Join request cancelled');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to cancel join request');
    } finally {
      setProcessingInviteId(null);
    }
  };

  // ACCEPT JOIN REQUEST / INVITATION
  const handleAcceptInvite = async (invite: TeamInvite) => {
    if (!currentUser?.uid) return;
    setProcessingInviteId(invite.id);

    try {
      // 1. Get latest team data
      const teamSnap = await get(ref(db, `teams/${invite.teamId}`));
      if (!teamSnap.exists()) {
        await remove(ref(db, `teamInvites/${invite.id}`));
        throw new Error('Team no longer exists.');
      }

      const teamData = teamSnap.val();
      const currentMembers = teamData.members || {};
      const memberKeys = Object.keys(currentMembers);

      if (memberKeys.length >= 6) {
        await remove(ref(db, `teamInvites/${invite.id}`));
        throw new Error('This squad is already full (Max 6 players / Captain + 5 Members).');
      }

      // Check next role
      const assignedRoles = Object.values(currentMembers).map((m: any) => m.role);
      let nextRole: TeamMember['role'] = 'Player 2';
      for (let i = 2; i <= 6; i++) {
        const r = `Player ${i}`;
        if (!assignedRoles.includes(r)) {
          nextRole = r;
          break;
        }
      }

      const newMember: TeamMember = {
        uid: currentUser.uid,
        username: currentUser.username || 'Player',
        inGameName: currentUser.inGameName || '',
        avatarUrl: currentUser.avatarUrl || DEFAULT_AVATAR,
        role: nextRole,
        joinedAt: Date.now()
      };

      // Add to team
      await update(ref(db, `teams/${invite.teamId}/members`), {
        [currentUser.uid]: newMember
      });

      // Remove invite
      await remove(ref(db, `teamInvites/${invite.id}`));

      // Push chat message
      await push(ref(db, `teamChats/${invite.teamId}/messages`), {
        senderUid: 'system',
        senderName: 'SYSTEM',
        text: `${currentUser.username} accepted the invite and joined the squad as ${nextRole}!`,
        timestamp: Date.now(),
        isSystem: true
      });

      toast.success(`You joined ${invite.teamName}!`);

      // Auto select team
      setSelectedTeam({
        id: invite.teamId,
        ...teamData,
        members: {
          ...currentMembers,
          [currentUser.uid]: newMember
        }
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to accept invitation');
    } finally {
      setProcessingInviteId(null);
    }
  };

  // DECLINE JOIN REQUEST / INVITATION
  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await remove(ref(db, `teamInvites/${inviteId}`));
      toast.success('Invitation declined');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to decline invitation');
    }
  };

  // LOAD REGISTERED USERS TO INVITE (Captain only)
  const handleOpenAddMember = async () => {
    if (!selectedTeam || !currentUser?.uid) return;
    if (selectedTeam.captainUid !== currentUser.uid) {
      return toast.error('Only the Team Captain can invite or add members.');
    }

    const currentCount = Object.keys(selectedTeam.members || {}).length;
    if (currentCount >= 6) {
      return toast.error('Squad is full (Captain + 5 Members / 6 Max).');
    }

    setShowAddMemberModal(true);
    setLoadingUsers(true);
    try {
      // Query top users from DB
      const usersQuery = query(ref(db, 'users'), orderByChild('totalEarnings'), limitToLast(80));
      const snap = await get(usersQuery);
      if (snap.exists()) {
        const val = snap.val();
        const list: any[] = [];
        Object.keys(val).forEach((uid) => {
          if (uid !== currentUser?.uid) {
            list.push({
              uid,
              username: val[uid].username || 'Anonymous',
              inGameName: val[uid].inGameName || '',
              avatarUrl: val[uid].avatarUrl || '',
              totalEarnings: val[uid].totalEarnings || 0
            });
          }
        });
        list.reverse();
        setAllUsersList(list);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // SEND INVITE TO A USER (Captain only)
  const handleSendInviteToUser = async (targetUser: any) => {
    if (!selectedTeam || !currentUser?.uid) return;
    if (selectedTeam.captainUid !== currentUser.uid) {
      return toast.error('Only the Team Captain can invite or add members.');
    }

    try {
      const currentMembers = selectedTeam.members || {};
      if (Object.keys(currentMembers).length >= 6) {
        return toast.error('Squad is full (Max 6 players / Captain + 5 Members).');
      }

      if (currentMembers[targetUser.uid]) {
        return toast.error('Player is already in this team.');
      }

      const inviteRef = push(ref(db, 'teamInvites'));
      await set(inviteRef, {
        teamId: selectedTeam.id,
        teamName: selectedTeam.name,
        teamCode: selectedTeam.code,
        captainUid: currentUser.uid,
        captainName: currentUser.username || 'Captain',
        captainAvatar: currentUser.avatarUrl || DEFAULT_AVATAR,
        invitedUid: targetUser.uid,
        invitedUsername: targetUser.username || 'Player',
        invitedAvatar: targetUser.avatarUrl || '',
        status: 'pending',
        createdAt: Date.now()
      });

      // Add system message in chat
      await push(ref(db, `teamChats/${selectedTeam.id}/messages`), {
        senderUid: 'system',
        senderName: 'SYSTEM',
        text: `Captain invited ${targetUser.username} to join the squad!`,
        timestamp: Date.now(),
        isSystem: true
      });

      toast.success(`Invitation sent to ${targetUser.username}!`);
      setSentInvitesMap((prev) => ({ ...prev, [targetUser.uid]: true }));
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to send invitation');
    }
  };

  // CLEAR CHAT (Captain only)
  const handleConfirmClearChat = async () => {
    if (!selectedTeam || !currentUser?.uid) return;
    if (selectedTeam.captainUid !== currentUser.uid) {
      return toast.error('Only the Team Captain can clear the chat.');
    }

    setIsClearingChat(true);
    try {
      await remove(ref(db, `teamChats/${selectedTeam.id}/messages`));

      // Push system announcement
      await push(ref(db, `teamChats/${selectedTeam.id}/messages`), {
        senderUid: 'system',
        senderName: 'SYSTEM',
        text: `Chat history was cleared by Captain ${currentUser.username || ''}.`,
        timestamp: Date.now(),
        isSystem: true
      });

      setMessages([]);
      setShowClearChatConfirm(false);
      setShowSettingsModal(false);
      toast.success('Team chat cleared successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to clear chat');
    } finally {
      setIsClearingChat(false);
    }
  };

  // SEND CHAT MESSAGE
  const handleSendMessage = async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    if (!selectedTeam || !currentUser?.uid) return;

    const textToSend = (directText || messageInput).trim();
    if (!textToSend) return;

    const isCaptain = selectedTeam.captainUid === currentUser.uid;
    const myMemberInfo = selectedTeam.members?.[currentUser.uid];
    const myRole = isCaptain ? 'Captain' : myMemberInfo?.role || 'Player';

    try {
      const chatRef = push(ref(db, `teamChats/${selectedTeam.id}/messages`));
      await set(chatRef, {
        senderUid: currentUser.uid,
        senderName: currentUser.username || 'Member',
        senderAvatar: currentUser.avatarUrl || DEFAULT_AVATAR,
        senderRole: myRole,
        text: textToSend,
        timestamp: Date.now(),
        isSystem: false
      });

      if (!directText) setMessageInput('');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to send message');
    }
  };

  // UPDATE TEAM LOGO (From Settings)
  const handleUpdateSettingsLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTeam) return;

    const loadingToast = toast.loading('Uploading team logo...');
    setIsUpdatingLogo(true);

    try {
      // Compress image
      const compressedBlob = await compressImage(file, 400, 400, 0.6);
      
      const formData = new FormData();
      formData.append('image', compressedBlob, 'logo.jpg');

      const apiKey = appSettings?.imgbbApiKey?.trim() || import.meta.env.VITE_IMGBB_API_KEY || '29348d4d4bf16a193ea8df02d632bf96';
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        const imageUrl = result.data.url;
        
        // Update in Realtime Database
        await update(ref(db, `teams/${selectedTeam.id}`), {
          logoUrl: imageUrl
        });

        // Add a system message to chat
        await push(ref(db, `teamChats/${selectedTeam.id}/messages`), {
          senderUid: 'system',
          senderName: 'SYSTEM',
          text: `Team logo was updated by Captain ${currentUser.username}.`,
          timestamp: Date.now(),
          isSystem: true
        });

        setSelectedTeam((prev) => prev ? { ...prev, logoUrl: imageUrl } : null);
        toast.dismiss(loadingToast);
        toast.success('Team logo updated successfully!');
      } else {
        throw new Error(result.error?.message || 'Failed to upload logo to ImgBB');
      }
    } catch (err: any) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error(err.message || 'Error updating logo');
    } finally {
      setIsUpdatingLogo(false);
    }
  };

  // RENAME TEAM (From Settings)
  const handleRenameTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !currentUser?.uid) return;
    if (selectedTeam.captainUid !== currentUser.uid) {
      return toast.error('Only the Team Captain can rename the team.');
    }

    const clean = editNameInput.trim();
    if (!clean || clean.length < 2) {
      return toast.error('Name must be at least 2 characters.');
    }
    if (clean.length > 25) {
      return toast.error('Name cannot exceed 25 characters.');
    }

    setIsSavingName(true);
    try {
      await update(ref(db, `teams/${selectedTeam.id}`), {
        name: clean,
        updatedAt: Date.now()
      });

      // System message
      await push(ref(db, `teamChats/${selectedTeam.id}/messages`), {
        senderUid: 'system',
        senderName: 'SYSTEM',
        text: `Team was renamed to "${clean}" by Captain ${currentUser.username}.`,
        timestamp: Date.now(),
        isSystem: true
      });

      setSelectedTeam((prev) => prev ? { ...prev, name: clean } : null);
      toast.success('Team name updated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update team name');
    } finally {
      setIsSavingName(false);
    }
  };

  // CONFIRM KICK MEMBER
  const handleConfirmKick = async () => {
    if (!selectedTeam || !memberToKick || !currentUser?.uid) return;
    if (selectedTeam.captainUid !== currentUser.uid) {
      return toast.error('Only the Team Captain can remove members.');
    }
    if (memberToKick.uid === currentUser.uid) {
      return toast.error('Captain cannot be removed. You can delete the team instead.');
    }

    const kickedUser = memberToKick;
    const currentTeamId = selectedTeam.id;

    // Instant optimistic update on Captain side
    setSelectedTeam((prev) => {
      if (!prev) return null;
      const updatedMembers = { ...prev.members };
      delete updatedMembers[kickedUser.uid];
      return {
        ...prev,
        members: updatedMembers
      };
    });
    setMemberToKick(null);

    try {
      await remove(ref(db, `teams/${currentTeamId}/members/${kickedUser.uid}`));

      // System message
      await push(ref(db, `teamChats/${currentTeamId}/messages`), {
        senderUid: 'system',
        senderName: 'SYSTEM',
        text: `${kickedUser.username} was removed from the squad by Captain.`,
        timestamp: Date.now(),
        isSystem: true
      });

      toast.success(`${kickedUser.username} removed from team.`);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to remove member');
    }
  };

  // CONFIRM DELETE TEAM (Captain only)
  const handleConfirmDelete = async () => {
    if (!selectedTeam || !currentUser?.uid) return;
    if (selectedTeam.captainUid !== currentUser.uid) {
      return toast.error('Only the Team Captain can delete the team.');
    }

    try {
      await remove(ref(db, `teams/${selectedTeam.id}`));
      await remove(ref(db, `teamChats/${selectedTeam.id}`));

      toast.success(`Team "${selectedTeam.name}" deleted permanently.`);
      setShowDeleteConfirm(false);
      setShowSettingsModal(false);
      setSelectedTeam(null);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete team');
    }
  };

  // CONFIRM LEAVE TEAM (Regular members)
  const handleConfirmLeave = async () => {
    if (!selectedTeam || !currentUser?.uid) return;
    if (selectedTeam.captainUid === currentUser.uid) {
      return toast.error('Captain cannot leave team. You can delete the team or transfer ownership.');
    }

    try {
      await remove(ref(db, `teams/${selectedTeam.id}/members/${currentUser.uid}`));

      await push(ref(db, `teamChats/${selectedTeam.id}/messages`), {
        senderUid: 'system',
        senderName: 'SYSTEM',
        text: `${currentUser.username} has left the squad.`,
        timestamp: Date.now(),
        isSystem: true
      });

      toast.success('You have left the team.');
      setShowLeaveConfirm(false);
      setShowSettingsModal(false);
      setSelectedTeam(null);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to leave team');
    }
  };

  // Copy code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Team code ${code} copied! Share with your squad.`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const isCurrentCaptain = selectedTeam && currentUser?.uid === selectedTeam.captainUid;

  // Format squad roster members
  const memberList: TeamMember[] = selectedTeam ? Object.values(selectedTeam.members || {}) : [];
  const captainMember = memberList.find((m) => m.role === 'Captain' || m.uid === selectedTeam?.captainUid);
  const otherMembers = memberList.filter((m) => m.uid !== captainMember?.uid);

  // Filtered users for Add Member modal
  const filteredUsers = allUsersList.filter((u) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.inGameName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden select-none">
      
      {/* 1. TOP HEADER */}
      <div className="h-16 px-4 bg-zinc-950/90 backdrop-blur-md border-b border-yellow-900/40 flex items-center justify-between shrink-0 z-20">
        
        {/* Left: Back Button */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => {
              if (selectedTeam) {
                setSelectedTeam(null);
              } else {
                onClose();
              }
            }}
            className="w-10 h-10 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-yellow-500/50 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {/* Header Title: In Team screen, ONLY show Team Name */}
          <div>
            {selectedTeam ? (
              <h1 className="text-lg font-black uppercase tracking-wider text-yellow-400 font-display flex items-center">
                {selectedTeam.name}
              </h1>
            ) : (
              <h1 className="text-base font-black uppercase tracking-wider text-white">
                MY TEAMS
              </h1>
            )}
          </div>
        </div>

        {/* Right Action: In Team screen -> Settings Button ⚙️ (For both Captain & Members) */}
        <div className="flex items-center space-x-2">
          {selectedTeam ? (
            <button
              onClick={() => {
                setEditNameInput(selectedTeam.name);
                setShowSettingsModal(true);
              }}
              className="w-10 h-10 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-yellow-500/60 text-zinc-300 hover:text-yellow-400 flex items-center justify-center transition-all shadow-md active:scale-95"
              title="Team Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* ============================================================ */}
        {/* VIEW A: TEAMS LIST & TOP BUTTONS (CREATE / JOIN / REQUESTS) */}
        {/* ============================================================ */}
        {!selectedTeam && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-lg mx-auto w-full pb-24">
            
            {/* Top 2 Buttons: CREATE and JOIN */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveAction(activeAction === 'CREATE' ? 'NONE' : 'CREATE')}
                className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg ${
                  activeAction === 'CREATE'
                    ? 'bg-yellow-500 text-black shadow-yellow-500/25 ring-2 ring-yellow-400'
                    : 'bg-gradient-to-r from-yellow-500/20 via-yellow-500/15 to-yellow-500/10 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/25'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>CREATE</span>
              </button>

              <button
                onClick={() => setActiveAction(activeAction === 'JOIN' ? 'NONE' : 'JOIN')}
                className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg ${
                  activeAction === 'JOIN'
                    ? 'bg-yellow-500 text-black shadow-yellow-500/25 ring-2 ring-yellow-400'
                    : 'bg-zinc-900 border border-zinc-800 hover:border-yellow-500/40 text-zinc-300 hover:text-yellow-400 hover:bg-zinc-800'
                }`}
              >
                <Key className="w-4 h-4 text-yellow-500" />
                <span>JOIN</span>
              </button>
            </div>

            {/* Dedicated JOIN REQUESTS Button with dynamic pending count */}
            <button
              onClick={() => setActiveAction(activeAction === 'REQUESTS' ? 'NONE' : 'REQUESTS')}
              className={`w-full flex items-center justify-between py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md border ${
                activeAction === 'REQUESTS'
                  ? 'bg-yellow-500/20 border-yellow-400 text-yellow-400 ring-2 ring-yellow-400/40 shadow-yellow-500/10'
                  : joinRequests.length > 0
                  ? 'bg-gradient-to-r from-yellow-950/60 via-zinc-900 to-zinc-900 border-yellow-500/60 text-white hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                  : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center relative ${
                  joinRequests.length > 0
                    ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/30'
                    : 'bg-zinc-800 text-zinc-400'
                }`}>
                  <Bell className="w-4 h-4" />
                  {joinRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black animate-ping" />
                  )}
                </div>
                <span className="font-display tracking-wider">JOIN REQUESTS</span>
              </div>

              <div className="flex items-center space-x-2">
                {joinRequests.length > 0 ? (
                  <span className="bg-yellow-500 text-black font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-sm flex items-center space-x-1 animate-pulse">
                    <span>{joinRequests.length}</span>
                    <span className="text-[9px] uppercase">Pending</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full font-medium">
                    0 Requests
                  </span>
                )}
                <ChevronRight className={`w-4 h-4 text-zinc-500 transition-transform ${activeAction === 'REQUESTS' ? 'rotate-90 text-yellow-400' : ''}`} />
              </div>
            </button>

            {/* EXPANDABLE ACTION FORMS */}
            <AnimatePresence>
              {/* Empty state when user clicks JOIN REQUESTS button but has 0 pending requests */}
              {activeAction === 'REQUESTS' && joinRequests.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center space-y-2 shadow-inner overflow-hidden"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                    <Bell className="w-5 h-5 text-yellow-500/60" />
                  </div>
                  <p className="text-xs font-black text-white uppercase tracking-wider">No Pending Join Requests</p>
                  <p className="text-[10px] text-zinc-400 max-w-xs mx-auto leading-relaxed">
                    When a Team Captain sends you an invitation, their request card will appear here instantly.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* JOIN REQUESTS / INVITATIONS SECTION */}
            {(activeAction === 'REQUESTS' || joinRequests.length > 0) && joinRequests.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-yellow-950/40 via-zinc-900 to-zinc-950 border-2 border-yellow-500/50 rounded-2xl p-3.5 space-y-3 shadow-[0_0_20px_rgba(234,179,8,0.15)] relative overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-yellow-500/20 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                    </span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center">
                      <Bell className="w-3.5 h-3.5 mr-1" />
                      JOIN REQUESTS & INVITATIONS ({joinRequests.length})
                    </h3>
                  </div>
                  <span className="text-[9px] bg-yellow-500/20 text-yellow-400 font-black px-2 py-0.5 rounded-full border border-yellow-500/30">
                    Action Required
                  </span>
                </div>

                <div className="space-y-2.5">
                  {joinRequests.map((invite) => {
                    const isSentRequest = invite.type === 'request';

                    return (
                      <div 
                        key={invite.id} 
                        className="bg-black/60 border border-yellow-500/30 rounded-xl p-3 flex flex-col space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full ring-2 ring-yellow-400 border-2 border-yellow-500 p-0.5 bg-black overflow-hidden relative shrink-0 shadow-[0_0_8px_rgba(234,179,8,0.4)]">
                              {invite.captainAvatar ? (
                                <img src={invite.captainAvatar} alt={invite.captainName} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-xs font-black text-yellow-400">
                                  {invite.captainName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-yellow-500 rounded-full border border-black flex items-center justify-center text-[7px] text-black font-black">
                                👑
                              </span>
                            </div>

                            <div>
                              <div className="text-xs font-black text-white flex items-center space-x-1.5">
                                <span>Captain {invite.captainName}</span>
                                {isSentRequest && (
                                  <span className="text-[8px] bg-yellow-500/20 text-yellow-400 font-bold px-1.5 py-0.2 rounded border border-yellow-500/30">
                                    Join Request Sent
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-yellow-400 font-bold">
                                {isSentRequest ? (
                                  <>Requested to join: <strong className="text-white uppercase font-black">{invite.teamName}</strong></>
                                ) : (
                                  <>Invited you to join squad: <strong className="text-white uppercase font-black">{invite.teamName}</strong></>
                                )}
                              </div>
                              <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                                Code: {invite.teamCode} {isSentRequest && '• Waiting for Captain approval'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        {isSentRequest ? (
                          <div className="pt-1 border-t border-zinc-800/80 flex items-center justify-between">
                            <span className="text-[10px] text-zinc-400 font-medium italic">
                              Pending Captain's decision...
                            </span>
                            <button
                              onClick={() => handleCancelJoinRequest(invite.id)}
                              disabled={processingInviteId === invite.id}
                              className="bg-zinc-900 hover:bg-red-500/20 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 font-bold py-1.5 px-3 rounded-lg text-xs transition-colors"
                            >
                              Cancel Request
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
                            <button
                              onClick={() => handleDeclineInvite(invite.id)}
                              disabled={processingInviteId === invite.id}
                              className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white font-bold py-2 rounded-xl text-xs transition-colors"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleAcceptInvite(invite)}
                              disabled={processingInviteId === invite.id}
                              className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-black py-2 rounded-xl text-xs transition-all shadow-md shadow-yellow-500/20 flex items-center justify-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Accept & Join</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* TEAMS SECTION (User's Teams List) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center">
                  <Shield className="w-3.5 h-3.5 mr-1.5 text-yellow-500" />
                  YOUR TEAMS & SQUADS
                </h2>
                <span className="text-[10px] text-zinc-500 font-bold">
                  {userTeams.length} Active
                </span>
              </div>

              {loading ? (
                <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center justify-center space-y-2">
                  <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading squads...</span>
                </div>
              ) : userTeams.length === 0 ? (
                <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-8 text-center space-y-3 shadow-inner">
                  <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center mx-auto shadow-lg shadow-yellow-500/5">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      No Teams Yet
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                      Create your own squad like <span className="text-yellow-500 font-bold">PKARENA X</span> or join your friend's team using their 6-character code!
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center space-x-2">
                    <button
                      onClick={() => setActiveAction('CREATE')}
                      className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs px-4 py-2 rounded-xl transition-all"
                    >
                      Create Team
                    </button>
                    <button
                      onClick={() => setActiveAction('JOIN')}
                      className="bg-zinc-900 border border-zinc-700 hover:border-yellow-500 text-zinc-300 text-xs px-4 py-2 rounded-xl transition-all"
                    >
                      Join Team
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {userTeams.map((team) => {
                    const membersCount = Object.keys(team.members || {}).length;
                    const isCaptain = team.captainUid === currentUser?.uid;
                    const membersArray: TeamMember[] = Object.values(team.members || {});

                    return (
                      <div
                        key={team.id}
                        onClick={() => setSelectedTeam(team)}
                        className="bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800 hover:border-yellow-500/60 rounded-2xl p-4 transition-all hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] cursor-pointer group relative overflow-hidden"
                      >
                        {/* Golden corner highlight */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-bl-full pointer-events-none" />

                        <div className="flex items-start justify-between relative z-10">
                          <div className="flex items-center space-x-3 min-w-0">
                            {/* Team Logo before team name and captain name */}
                            <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center shadow-lg">
                              {team.logoUrl ? (
                                <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-yellow-500/10 text-yellow-500 font-black flex items-center justify-center text-lg">
                                  {team.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <h3 className="text-base font-black text-white group-hover:text-yellow-400 transition-colors uppercase tracking-wider truncate">
                                {team.name}
                              </h3>
                              <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                                Captain: <strong className="text-zinc-200">{team.captainName}</strong>
                              </p>
                            </div>
                          </div>

                          {/* 6-Character Code Badge */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCode(team.code);
                            }}
                            className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 px-2.5 py-1 rounded-xl flex items-center space-x-1.5 transition-colors"
                            title="Click to copy code"
                          >
                            <span className="text-[10px] text-zinc-400 font-mono">CODE:</span>
                            <span className="text-xs font-black font-mono tracking-widest">{team.code}</span>
                            {copiedCode === team.code ? (
                              <Check className="w-3.5 h-3.5 text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-yellow-500" />
                            )}
                          </div>
                        </div>

                        {/* Players Roster Preview */}
                        <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            {membersArray.map((m, idx) => {
                              const isSlotCaptain = m.role === 'Captain' || m.uid === team.captainUid;
                              return (
                                <div
                                  key={m.uid || idx}
                                  className={`w-8 h-8 rounded-full overflow-hidden relative shrink-0 ${
                                    isSlotCaptain 
                                      ? 'ring-2 ring-yellow-400 border-2 border-yellow-500 p-0.5 bg-black shadow-[0_0_8px_rgba(234,179,8,0.5)]' 
                                      : 'border border-zinc-700 bg-zinc-800'
                                  }`}
                                  title={`${m.role}: ${m.username}`}
                                >
                                  {m.avatarUrl ? (
                                    <img src={m.avatarUrl} alt={m.username} className="w-full h-full object-cover rounded-full" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white">
                                      {m.username.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  {isSlotCaptain && (
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-yellow-500 rounded-full border border-black flex items-center justify-center text-[6px] text-black font-black">
                                      ★
                                    </span>
                                  )}
                                </div>
                              );
                            })}

                            {/* Empty slot indicators up to 6 */}
                            {Array.from({ length: Math.max(0, 6 - membersCount) }).map((_, i) => (
                              <div
                                key={'empty_' + i}
                                className="w-8 h-8 rounded-full border border-dashed border-zinc-700 flex items-center justify-center text-[10px] text-zinc-600"
                                title="Open Slot"
                              >
                                +
                              </div>
                            ))}

                            <span className="text-[11px] font-bold text-zinc-400 ml-1.5">
                              {membersCount}/6
                            </span>
                          </div>

                          <div className="flex items-center text-xs font-bold text-yellow-500 group-hover:translate-x-1 transition-transform">
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            <span>CHAT</span>
                            <ChevronRight className="w-4 h-4 ml-0.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW B: TEAM DETAIL & REAL-TIME CHAT SCREEN                 */}
        {/* ============================================================ */}
        {selectedTeam && (
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-black">
            
            {/* COMPACT TEAM MEMBERS HORIZONTAL STRIP (Under Header) */}
            <div 
              onClick={() => setShowMembersModal(true)}
              className="bg-zinc-950 border-b border-zinc-800/80 px-4 py-2.5 flex items-center justify-between shrink-0 cursor-pointer hover:bg-zinc-900/60 transition-colors group"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-yellow-500 flex items-center shrink-0">
                  <Shield className="w-3.5 h-3.5 mr-1" />
                  MEMBERS ({memberList.length}/6):
                </span>

                {/* Profile Avatars: Captain First with Golden Outline */}
                <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-hide py-0.5">
                  {/* Captain Avatar */}
                  {captainMember && (
                    <div 
                      className="w-8 h-8 rounded-full ring-2 ring-yellow-400 border-2 border-yellow-500 p-0.5 bg-black shadow-[0_0_10px_rgba(234,179,8,0.5)] overflow-hidden relative shrink-0"
                      title={`👑 Captain: ${captainMember.username}`}
                    >
                      {captainMember.avatarUrl ? (
                        <img src={captainMember.avatarUrl} alt={captainMember.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-black text-yellow-400">
                          {captainMember.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-yellow-500 rounded-full border border-black flex items-center justify-center text-[6px] text-black font-black">
                        ★
                      </span>
                    </div>
                  )}

                  {/* Other Members Avatars */}
                  {otherMembers.map((m) => (
                    <div
                      key={m.uid}
                      className="w-7 h-7 rounded-full border border-zinc-700 bg-zinc-800 overflow-hidden relative shrink-0"
                      title={`${m.role}: ${m.username}`}
                    >
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-white">
                          {m.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Empty Slots */}
                  {Array.from({ length: Math.max(0, 6 - memberList.length) }).map((_, i) => (
                    <div
                      key={'empty_' + i}
                      className="w-6 h-6 rounded-full border border-dashed border-zinc-700 flex items-center justify-center text-[10px] text-zinc-600 shrink-0"
                    >
                      +
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Arrow Icon & Incoming Requests Counter */}
              <div className="flex items-center space-x-2 text-zinc-400 group-hover:text-yellow-400 transition-colors shrink-0">
                {isCurrentCaptain && incomingTeamRequests.length > 0 && (
                  <span className="bg-yellow-500 text-black font-black text-[9px] px-2 py-0.5 rounded-full flex items-center space-x-1 animate-pulse shadow-md shadow-yellow-500/30">
                    <Bell className="w-2.5 h-2.5" />
                    <span>{incomingTeamRequests.length} Request{incomingTeamRequests.length > 1 ? 's' : ''}</span>
                  </span>
                )}
                <span className="text-[10px] font-bold hidden sm:inline">Manage</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* INCOMING JOIN REQUESTS BANNER FOR CAPTAIN (Direct 1-click Approval) */}
            {isCurrentCaptain && incomingTeamRequests.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-950/80 via-zinc-900 to-zinc-950 border-b border-yellow-500/40 p-3 shrink-0 shadow-lg relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                    </span>
                    <span className="text-xs font-black text-yellow-400 uppercase tracking-wider flex items-center">
                      <UserPlus className="w-3.5 h-3.5 mr-1" />
                      Pending Squad Join Request ({incomingTeamRequests.length})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowMembersModal(true)}
                    className="text-[10px] text-zinc-400 hover:text-yellow-400 underline font-semibold"
                  >
                    View in Members
                  </button>
                </div>

                <div className="space-y-1.5">
                  {incomingTeamRequests.slice(0, 2).map((req) => (
                    <div
                      key={req.id}
                      className="bg-black/70 border border-yellow-500/30 rounded-xl p-2 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-7 h-7 rounded-full border border-zinc-700 bg-zinc-800 overflow-hidden shrink-0">
                          {req.invitedAvatar ? (
                            <img src={req.invitedAvatar} alt={req.invitedUsername} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-yellow-400">
                              {req.invitedUsername.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate flex items-center space-x-1">
                            <span>{req.invitedUsername}</span>
                            <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1 py-0.2 rounded font-mono">
                              CODE: {req.teamCode}
                            </span>
                          </div>
                          <div className="text-[9px] text-zinc-400 truncate">
                            {req.invitedInGameName ? `IGN: ${req.invitedInGameName}` : 'Wants to join squad'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => handleCaptainRejectRequest(req.id, req.invitedUsername)}
                          disabled={processingInviteId === req.id}
                          className="bg-zinc-900 hover:bg-red-500/20 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleCaptainAcceptRequest(req)}
                          disabled={processingInviteId === req.id}
                          className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-black px-3 py-1 rounded-lg text-xs flex items-center space-x-1 shadow-sm transition-all"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Accept</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {incomingTeamRequests.length > 2 && (
                    <button
                      onClick={() => setShowMembersModal(true)}
                      className="text-[10px] text-yellow-400 hover:underline w-full text-center block pt-0.5"
                    >
                      +{incomingTeamRequests.length - 2} more request(s) waiting in Members
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* REALTIME CHAT MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-yellow-500 mb-2">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Squad Chat Ready</h4>
                  <p className="text-[11px] text-zinc-500 max-w-xs mt-1">
                    Coordinate match strategies, room ID & password, and squad calls here in real-time!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  if (msg.isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div className="bg-zinc-900/80 border border-zinc-800 text-yellow-500/90 text-[10px] px-3 py-1 rounded-full text-center max-w-xs shadow-sm">
                          {msg.text}
                        </div>
                      </div>
                    );
                  }

                  const isMe = msg.senderUid === currentUser?.uid;
                  const isMsgCaptain = msg.senderRole === 'Captain' || msg.senderUid === selectedTeam.captainUid;

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end space-x-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMe && (
                        <div className={`w-7 h-7 rounded-full overflow-hidden shrink-0 ${
                          isMsgCaptain ? 'ring-1 ring-yellow-400 border border-yellow-500' : 'border border-zinc-700 bg-zinc-800'
                        }`}>
                          {msg.senderAvatar ? (
                            <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white">
                              {msg.senderName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}

                      <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 shadow-md ${
                        isMe
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-medium rounded-br-none'
                          : 'bg-zinc-900 border border-zinc-800 text-white rounded-bl-none'
                      }`}>
                        {!isMe && (
                          <div className="flex items-center space-x-1.5 mb-1">
                            <span className="text-[10px] font-black text-yellow-400">
                              {msg.senderName}
                            </span>
                            {isMsgCaptain && (
                              <span className="text-[8px] bg-yellow-500/20 text-yellow-400 px-1 py-0.2 rounded font-bold border border-yellow-500/30">
                                👑 CAPTAIN
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-xs break-words whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </p>

                        <div className={`text-[8px] text-right mt-1 ${isMe ? 'text-black/70 font-semibold' : 'text-zinc-500'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* QUICK PRESET CHAT CHIPS */}
            <div className="px-3 py-1.5 bg-zinc-950/80 border-t border-zinc-900 flex space-x-2 overflow-x-auto scrollbar-hide shrink-0">
              {[
                "Ready for match! 🎯",
                "Send Room ID & Pass 🔑",
                "Wait 2 mins ⏳",
                "Rush together! 💥",
                "GG WP! 🏆"
              ].map((quick, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(undefined, quick)}
                  className="bg-zinc-900 hover:bg-yellow-500/20 border border-zinc-800 hover:border-yellow-500/40 text-[10px] text-zinc-300 hover:text-yellow-400 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
                >
                  {quick}
                </button>
              ))}
            </div>

            {/* CHAT INPUT BAR */}
            <form onSubmit={handleSendMessage} className="p-3 bg-zinc-950 border-t border-zinc-800/80 flex items-center space-x-2 shrink-0">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={`Message #${selectedTeam.name}...`}
                className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-yellow-500 text-white text-xs rounded-xl px-3.5 py-3 focus:outline-none transition-colors placeholder-zinc-500"
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="w-11 h-11 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:hover:bg-yellow-500 text-black flex items-center justify-center transition-all shadow-md shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>
        )}

      </div>

      {/* ============================================================ */}
      {document.getElementById('modal-root') ? createPortal((<>
      {/* 3. SETTINGS MODAL (Triggered by ⚙️ in Header)                */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showSettingsModal && selectedTeam && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/30 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative overflow-y-auto max-h-[85vh] custom-scrollbar"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-black text-yellow-500 uppercase tracking-wider">
                    Team Settings
                  </h3>
                </div>
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Invite Code Button Section */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Invite Code (6-Character)
                </label>
                <div className="flex items-center justify-between bg-black/60 border border-yellow-500/30 rounded-lg p-2.5">
                  <span className="text-base font-black font-mono tracking-widest text-yellow-400">
                    {selectedTeam.code}
                  </span>
                  <button
                    onClick={() => handleCopyCode(selectedTeam.code)}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs px-3 py-1.5 rounded-md flex items-center space-x-1 transition-all"
                  >
                    {copiedCode === selectedTeam.code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-800" />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY CODE</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Share this 6-character code with your friends to let them join your squad directly.
                </p>
              </div>

              {/* 2. Change Team Name Input & Save Button (If Captain) */}
              {isCurrentCaptain && (
                <form onSubmit={handleRenameTeam} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-4">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    EDIT TEAM
                  </label>

                  {/* Current Logo Display */}
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <span className="block text-[8px] font-black text-zinc-500 uppercase tracking-wider">
                      Current Logo
                    </span>
                    <div className="w-16 h-16 rounded-full border border-zinc-800 bg-zinc-950 flex items-center justify-center overflow-hidden">
                      {selectedTeam.logoUrl ? (
                        <img src={selectedTeam.logoUrl} alt="Team Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-yellow-500/10 text-yellow-500 font-black flex items-center justify-center text-lg uppercase">
                          {selectedTeam.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Upload New logo button underneath logo */}
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        id="edit-team-logo-upload"
                        className="hidden"
                        onChange={handleUpdateSettingsLogo}
                        disabled={isUpdatingLogo}
                      />
                      <button
                        type="button"
                        disabled={isUpdatingLogo}
                        onClick={() => document.getElementById('edit-team-logo-upload')?.click()}
                        className="bg-zinc-850 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-1 px-2.5 rounded-lg text-[9px] uppercase tracking-wider flex items-center space-x-1 border border-zinc-700 transition-all active:scale-95"
                      >
                        <Upload className="w-2.5 h-2.5 text-yellow-500" />
                        <span>{isUpdatingLogo ? 'Uploading...' : 'Upload New'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Team Name Input field */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      Team Name
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={25}
                      value={editNameInput}
                      onChange={(e) => setEditNameInput(e.target.value)}
                      placeholder="Enter new name..."
                      className="w-full bg-black/60 border border-zinc-800 focus:border-yellow-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  {/* Save button below input */}
                  <div>
                    <button
                      type="submit"
                      disabled={isSavingName || !editNameInput.trim() || editNameInput.trim() === selectedTeam.name}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center space-x-1.5"
                    >
                      <span>{isSavingName ? 'Saving...' : 'Save Name'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* 3. Clear Chat Button (Captain Only) */}
              {isCurrentCaptain && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                  <div>
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Clear Team Chat
                    </span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      Erase all messages and chat history for everyone.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowClearChatConfirm(true);
                    }}
                    className="w-full bg-zinc-950 hover:bg-red-500/10 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 text-yellow-500 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Clear Chat</span>
                  </button>
                </div>
              )}

              {/* 4. Delete Team (Captain Only) */}
              {isCurrentCaptain && (
                <div className="pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Team Permanently</span>
                  </button>
                </div>
              )}

              {/* 5. Leave Squad (Members Only) */}
              {!isCurrentCaptain && (
                <div className="pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowLeaveConfirm(true);
                    }}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Squad</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 4. TEAM MEMBERS DETAILS MODAL (Triggered by Avatars Strip)    */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showMembersModal && selectedTeam && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/30 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 shrink-0">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-black text-yellow-500 uppercase tracking-wider">
                    Squad Members ({memberList.length}/6)
                  </h3>
                </div>
                <button 
                  onClick={() => setShowMembersModal(false)}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* TOP: Add Member Button (For Captain when squad < 6) */}
              {isCurrentCaptain && memberList.length < 6 && (
                <button
                  onClick={handleOpenAddMember}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-black py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-md shadow-yellow-500/20 shrink-0"
                >
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Add Member / Invite Players</span>
                </button>
              )}

              {/* Squad Members List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {/* 1. Team Captain First (Golden Outline) */}
                {captainMember && (
                  <div className="bg-gradient-to-r from-yellow-500/10 via-zinc-900 to-zinc-900 border border-yellow-500/40 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Captain Avatar with Golden Ring */}
                      <div className="w-11 h-11 rounded-full ring-2 ring-yellow-400 border-2 border-yellow-500 p-0.5 bg-black overflow-hidden relative shadow-[0_0_12px_rgba(234,179,8,0.6)] shrink-0">
                        {captainMember.avatarUrl ? (
                          <img src={captainMember.avatarUrl} alt={captainMember.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-sm font-black text-yellow-400">
                            {captainMember.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-yellow-500 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-black">
                          👑
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-black text-white flex items-center space-x-1.5">
                          <span>{captainMember.username}</span>
                          {captainMember.uid === currentUser?.uid && (
                            <span className="text-[9px] text-yellow-500 font-bold">(You)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {captainMember.inGameName ? `IGN: ${captainMember.inGameName}` : 'No IGN'}
                        </div>
                        <span className="inline-block mt-0.5 text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-yellow-500 text-black">
                          👑 Team Captain (Creator)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Team Members with Remove Button */}
                {otherMembers.map((member) => (
                  <div 
                    key={member.uid}
                    className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-800 overflow-hidden relative shrink-0">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                            {member.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-black text-white flex items-center space-x-1.5">
                          <span>{member.username}</span>
                          {member.uid === currentUser?.uid && (
                            <span className="text-[9px] text-yellow-500 font-bold">(You)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {member.inGameName ? `IGN: ${member.inGameName}` : 'No IGN'}
                        </div>
                        <span className="inline-block mt-0.5 text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                          {member.role}
                        </span>
                      </div>
                    </div>

                    {/* Remove button for Captain on every member */}
                    {isCurrentCaptain && (
                      <button
                        onClick={() => setMemberToKick(member)}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors"
                        title={`Remove ${member.username}`}
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                ))}

                {/* Empty Slots */}
                {Array.from({ length: Math.max(0, 6 - memberList.length) }).map((_, i) => (
                  <div
                    key={'empty_slot_' + i}
                    className="border border-dashed border-zinc-800 rounded-xl p-3 flex items-center justify-between text-zinc-600"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full border border-dashed border-zinc-700 flex items-center justify-center text-xs">
                        +
                      </div>
                      <span className="text-xs font-bold">Open Squad Slot</span>
                    </div>
                    {isCurrentCaptain && (
                      <button
                        onClick={handleOpenAddMember}
                        className="text-[10px] font-bold text-yellow-500 hover:underline"
                      >
                        + Invite Player
                      </button>
                    )}
                  </div>
                ))}

                {/* ============================================================ */}
                {/* PENDING JOIN REQUESTS (VIA TEAM CODE) - CAPTAIN APPROVAL     */}
                {/* ============================================================ */}
                {isCurrentCaptain && (
                  <div className="pt-3 mt-1 border-t border-yellow-500/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="relative flex h-2 w-2">
                          {incomingTeamRequests.length > 0 && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                          )}
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${incomingTeamRequests.length > 0 ? 'bg-yellow-500' : 'bg-zinc-600'}`}></span>
                        </span>
                        <h4 className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center">
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Join Requests ({incomingTeamRequests.length})
                        </h4>
                      </div>
                      {incomingTeamRequests.length > 0 ? (
                        <span className="text-[9px] bg-yellow-500/20 text-yellow-400 font-bold px-2 py-0.5 rounded-full border border-yellow-500/30 animate-pulse">
                          Waiting Approval
                        </span>
                      ) : (
                        <span className="text-[9px] text-zinc-500 font-bold">
                          0 Pending
                        </span>
                      )}
                    </div>

                    {incomingTeamRequests.length === 0 ? (
                      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          No pending requests. When players use team code <strong className="text-yellow-500/90 font-mono">{selectedTeam.code}</strong>, their join request will appear here for your approval.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {incomingTeamRequests.map((req) => (
                          <div
                            key={req.id}
                            className="bg-black/70 border border-yellow-500/30 rounded-xl p-2.5 space-y-2 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-full border border-zinc-700 bg-zinc-800 overflow-hidden relative shrink-0">
                                  {req.invitedAvatar ? (
                                    <img
                                      src={req.invitedAvatar}
                                      alt={req.invitedUsername}
                                      className="w-full h-full rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-black text-yellow-400">
                                      {req.invitedUsername.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="text-xs font-black text-white truncate flex items-center space-x-1.5">
                                    <span>{req.invitedUsername}</span>
                                    <span className="text-[8px] bg-yellow-500/20 text-yellow-400 font-bold px-1.5 py-0.2 rounded border border-yellow-500/30">
                                      Code Request
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-zinc-400 truncate">
                                    {req.invitedInGameName ? `IGN: ${req.invitedInGameName}` : 'No In-Game Name'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Accept / Reject Buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
                              <button
                                onClick={() => handleCaptainRejectRequest(req.id, req.invitedUsername)}
                                disabled={processingInviteId === req.id}
                                className="bg-zinc-900 hover:bg-red-500/20 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 font-bold py-1.5 rounded-lg text-xs flex items-center justify-center space-x-1 transition-colors disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                              <button
                                onClick={() => handleCaptainAcceptRequest(req)}
                                disabled={processingInviteId === req.id}
                                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-black py-1.5 rounded-lg text-xs flex items-center justify-center space-x-1 transition-all shadow-sm shadow-yellow-500/20 disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>{processingInviteId === req.id ? 'Accepting...' : 'Accept'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* For Regular Members: Leave Team Button */}
              {!isCurrentCaptain && (
                <div className="pt-2 border-t border-zinc-800 shrink-0">
                  <button
                    onClick={() => {
                      setShowMembersModal(false);
                      setShowLeaveConfirm(true);
                    }}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Squad</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 5. ADD MEMBER / USER SEARCH MODAL (Triggered by + Add Member) */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showAddMemberModal && selectedTeam && (
          <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/30 rounded-2xl w-full max-w-sm p-5 space-y-3.5 shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 shrink-0">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-black text-yellow-500 uppercase tracking-wider">
                    Invite Players to Squad
                  </h3>
                </div>
                <button 
                  onClick={() => setShowAddMemberModal(false)}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search player username..."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {loadingUsers ? (
                  <div className="py-8 text-center text-zinc-500 text-xs flex flex-col items-center justify-center space-y-2">
                    <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    <span>Searching players...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs">
                    No players found matching "{userSearchQuery}".
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isAlreadyMember = selectedTeam.members?.[u.uid] !== undefined;
                    const isInviteSent = sentInvitesMap[u.uid];

                    return (
                      <div 
                        key={u.uid}
                        className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-2.5 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 overflow-hidden relative shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.username} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-white truncate">
                              {u.username}
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate">
                              {u.inGameName ? `IGN: ${u.inGameName}` : `Wins: ${u.totalEarnings || 0} Coins`}
                            </div>
                          </div>
                        </div>

                        {/* Action Status / Button */}
                        <div>
                          {isAlreadyMember ? (
                            <span className="text-[9px] font-bold bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg">
                              In Squad
                            </span>
                          ) : isInviteSent ? (
                            <span className="text-[9px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded-lg flex items-center space-x-1">
                              <Check className="w-3 h-3" />
                              <span>Sent</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendInviteToUser(u)}
                              className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 transition-all shadow-sm"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Invite</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 6. KICK CONFIRMATION MODAL                                   */}
      {/* ============================================================ */}
      <AnimatePresence>
        {memberToKick && (
          <div className="fixed inset-0 z-[140] bg-black/80 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-red-500/40 rounded-2xl w-full max-w-xs p-5 space-y-4 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <UserX className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Remove {memberToKick.username}?
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Are you sure you want to remove <strong className="text-white">{memberToKick.username}</strong> ({memberToKick.role}) from this squad?
                </p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setMemberToKick(null)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold py-2 rounded-xl text-xs hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmKick}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl text-xs shadow-lg shadow-red-600/30"
                >
                  Yes, Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 7. DELETE TEAM CONFIRMATION MODAL                            */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[140] bg-black/80 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-red-500/40 rounded-2xl w-full max-w-xs p-5 space-y-4 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Delete {selectedTeam?.name}?
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  This will permanently delete this squad and its chat history for all players. This action cannot be undone.
                </p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold py-2 rounded-xl text-xs hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl text-xs shadow-lg shadow-red-600/30"
                >
                  Delete Team
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 8. LEAVE TEAM CONFIRMATION MODAL                             */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <div className="fixed inset-0 z-[140] bg-black/80 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-red-500/40 rounded-2xl w-full max-w-xs p-5 space-y-4 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Leave {selectedTeam?.name}?
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Are you sure you want to leave this team? You will need the 6-character code to join back.
                </p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold py-2 rounded-xl text-xs hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLeave}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl text-xs shadow-lg shadow-red-600/30"
                >
                  Leave Team
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 9. CLEAR CHAT CONFIRMATION MODAL (Captain Only)              */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showClearChatConfirm && (
          <div className="fixed inset-0 z-[140] bg-black/80 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/40 rounded-2xl w-full max-w-xs p-5 space-y-4 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center mx-auto">
                <Eraser className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Clear Team Chat?
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Are you sure you want to clear all chat messages in <strong className="text-yellow-400">{selectedTeam?.name}</strong>? This cannot be undone.
                </p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowClearChatConfirm(false)}
                  disabled={isClearingChat}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold py-2 rounded-xl text-xs hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClearChat}
                  disabled={isClearingChat}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black py-2 rounded-xl text-xs shadow-lg shadow-yellow-500/20 disabled:opacity-50"
                >
                  {isClearingChat ? 'Clearing...' : 'Yes, Clear'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 10. CREATE TEAM POPUP MODAL                                  */}
      {/* ============================================================ */}
      <AnimatePresence>
        {activeAction === 'CREATE' && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/30 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative overflow-hidden"
            >
              {/* Golden background aura */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-bl-full pointer-events-none" />

              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-black">
                    +
                  </div>
                  <h3 className="text-sm font-black uppercase text-yellow-500 tracking-wider">
                    Create New Squad
                  </h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setActiveAction('NONE')}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTeam} className="space-y-4">
                {/* LOGO UPLOAD OPTION */}
                <div className="flex flex-col items-center justify-center space-y-2 py-2">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">
                    Team Logo
                  </label>
                  <div className="relative group cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLogo}
                      disabled={isUploadingLogo}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-700 group-hover:border-yellow-500 bg-zinc-900 flex flex-col items-center justify-center overflow-hidden transition-all relative">
                      {isUploadingLogo ? (
                        <div className="flex flex-col items-center space-y-1">
                          <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-[8px] text-zinc-500">Uploading...</span>
                        </div>
                      ) : newTeamLogo ? (
                        <>
                          <img src={newTeamLogo} alt="Team Logo" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload className="w-4 h-4 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center space-y-1 text-zinc-500 group-hover:text-yellow-500 transition-colors">
                          <Upload className="w-5 h-5" />
                          <span className="text-[8px] font-bold uppercase tracking-wider text-center px-1">Upload Logo</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Small floating edit icon */}
                    {!isUploadingLogo && (
                      <div className="absolute bottom-0 right-0 bg-yellow-500 text-black p-1 rounded-full shadow-md">
                        <Upload className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                  {newTeamLogo && (
                    <button
                      type="button"
                      onClick={() => setNewTeamLogo('')}
                      className="text-[10px] text-red-400 hover:text-red-300 font-bold transition-colors"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>

                {/* TEAM NAME INPUT */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Team Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={25}
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Enter Team Name..."
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-2.5 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    You will become the <strong className="text-yellow-400">Team Captain</strong>. A unique <strong className="text-yellow-400">6-character code (e.g. PK4920)</strong> will be generated so other players can join your squad.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !newTeamName.trim() || isUploadingLogo}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black py-3 rounded-xl text-xs uppercase tracking-wider hover:opacity-95 disabled:opacity-50 transition-opacity shadow-lg"
                >
                  {isSubmitting ? 'Creating Team...' : 'Create Team & Get Code'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 11. JOIN TEAM POPUP MODAL                                    */}
      {/* ============================================================ */}
      <AnimatePresence>
        {activeAction === 'JOIN' && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/30 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative overflow-hidden"
            >
              {/* Golden background aura */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-bl-full pointer-events-none" />

              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-black">
                    #
                  </div>
                  <h3 className="text-sm font-black uppercase text-yellow-500 tracking-wider">
                    Join Team with Code
                  </h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setActiveAction('NONE')}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleJoinTeam} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Enter 6-Character Squad Code
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PK4920"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-center text-lg font-mono tracking-widest text-yellow-400 placeholder-zinc-700 focus:outline-none transition-colors uppercase"
                    autoFocus
                  />
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2.5 text-[11px] text-zinc-300 leading-relaxed flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  <span>
                    Code enter krne ke baad aapki <strong>Join Request</strong> Captain ke paas jayegi. Captain ke <strong>Accept</strong> krne ke baad hi aap squad mein add honge.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || joinCode.trim().length < 4}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black py-3 rounded-xl text-xs uppercase tracking-wider hover:opacity-95 disabled:opacity-50 transition-opacity shadow-lg flex items-center justify-center space-x-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Sending Request...' : 'Send Join Request to Captain'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

</>), document.getElementById('modal-root')!) : (<>
      {/* 3. SETTINGS MODAL (Triggered by ⚙️ in Header)                */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showSettingsModal && selectedTeam && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/30 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative overflow-y-auto max-h-[85vh] custom-scrollbar"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-black text-yellow-500 uppercase tracking-wider">
                    Team Settings
                  </h3>
                </div>
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Invite Code Button Section */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  Invite Code (6-Character)
                </label>
                <div className="flex items-center justify-between bg-black/60 border border-yellow-500/30 rounded-lg p-2.5">
                  <span className="text-base font-black font-mono tracking-widest text-yellow-400">
                    {selectedTeam.code}
                  </span>
                  <button
                    onClick={() => handleCopyCode(selectedTeam.code)}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs px-3 py-1.5 rounded-md flex items-center space-x-1 transition-all"
                  >
                    {copiedCode === selectedTeam.code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-800" />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY CODE</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Share this 6-character code with your friends to let them join your squad directly.
                </p>
              </div>

              {/* 2. Change Team Name Input & Save Button (If Captain) */}
              {isCurrentCaptain && (
                <form onSubmit={handleRenameTeam} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-4">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    EDIT TEAM
                  </label>

                  {/* Current Logo Display */}
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <span className="block text-[8px] font-black text-zinc-500 uppercase tracking-wider">
                      Current Logo
                    </span>
                    <div className="w-16 h-16 rounded-full border border-zinc-800 bg-zinc-950 flex items-center justify-center overflow-hidden">
                      {selectedTeam.logoUrl ? (
                        <img src={selectedTeam.logoUrl} alt="Team Logo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-yellow-500/10 text-yellow-500 font-black flex items-center justify-center text-lg uppercase">
                          {selectedTeam.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Upload New logo button underneath logo */}
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        id="edit-team-logo-upload"
                        className="hidden"
                        onChange={handleUpdateSettingsLogo}
                        disabled={isUpdatingLogo}
                      />
                      <button
                        type="button"
                        disabled={isUpdatingLogo}
                        onClick={() => document.getElementById('edit-team-logo-upload')?.click()}
                        className="bg-zinc-850 hover:bg-zinc-800 disabled:opacity-50 text-white font-bold py-1 px-2.5 rounded-lg text-[9px] uppercase tracking-wider flex items-center space-x-1 border border-zinc-700 transition-all active:scale-95"
                      >
                        <Upload className="w-2.5 h-2.5 text-yellow-500" />
                        <span>{isUpdatingLogo ? 'Uploading...' : 'Upload New'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Team Name Input field */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                      Team Name
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={25}
                      value={editNameInput}
                      onChange={(e) => setEditNameInput(e.target.value)}
                      placeholder="Enter new name..."
                      className="w-full bg-black/60 border border-zinc-800 focus:border-yellow-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  {/* Save button below input */}
                  <div>
                    <button
                      type="submit"
                      disabled={isSavingName || !editNameInput.trim() || editNameInput.trim() === selectedTeam.name}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center space-x-1.5"
                    >
                      <span>{isSavingName ? 'Saving...' : 'Save Name'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* 3. Clear Chat Button (Captain Only) */}
              {isCurrentCaptain && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                  <div>
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Clear Team Chat
                    </span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      Erase all messages and chat history for everyone.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowClearChatConfirm(true);
                    }}
                    className="w-full bg-zinc-950 hover:bg-red-500/10 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 text-yellow-500 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Clear Chat</span>
                  </button>
                </div>
              )}

              {/* 4. Delete Team (Captain Only) */}
              {isCurrentCaptain && (
                <div className="pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Team Permanently</span>
                  </button>
                </div>
              )}

              {/* 5. Leave Squad (Members Only) */}
              {!isCurrentCaptain && (
                <div className="pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      setShowLeaveConfirm(true);
                    }}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Squad</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 4. TEAM MEMBERS DETAILS MODAL (Triggered by Avatars Strip)    */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showMembersModal && selectedTeam && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/30 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 shrink-0">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-black text-yellow-500 uppercase tracking-wider">
                    Squad Members ({memberList.length}/6)
                  </h3>
                </div>
                <button 
                  onClick={() => setShowMembersModal(false)}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* TOP: Add Member Button (For Captain when squad < 6) */}
              {isCurrentCaptain && memberList.length < 6 && (
                <button
                  onClick={handleOpenAddMember}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-black py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-md shadow-yellow-500/20 shrink-0"
                >
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Add Member / Invite Players</span>
                </button>
              )}

              {/* Squad Members List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {/* 1. Team Captain First (Golden Outline) */}
                {captainMember && (
                  <div className="bg-gradient-to-r from-yellow-500/10 via-zinc-900 to-zinc-900 border border-yellow-500/40 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Captain Avatar with Golden Ring */}
                      <div className="w-11 h-11 rounded-full ring-2 ring-yellow-400 border-2 border-yellow-500 p-0.5 bg-black overflow-hidden relative shadow-[0_0_12px_rgba(234,179,8,0.6)] shrink-0">
                        {captainMember.avatarUrl ? (
                          <img src={captainMember.avatarUrl} alt={captainMember.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-sm font-black text-yellow-400">
                            {captainMember.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-yellow-500 rounded-full border border-black flex items-center justify-center text-[8px] text-black font-black">
                          👑
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-black text-white flex items-center space-x-1.5">
                          <span>{captainMember.username}</span>
                          {captainMember.uid === currentUser?.uid && (
                            <span className="text-[9px] text-yellow-500 font-bold">(You)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {captainMember.inGameName ? `IGN: ${captainMember.inGameName}` : 'No IGN'}
                        </div>
                        <span className="inline-block mt-0.5 text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-yellow-500 text-black">
                          👑 Team Captain (Creator)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Team Members with Remove Button */}
                {otherMembers.map((member) => (
                  <div 
                    key={member.uid}
                    className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-800 overflow-hidden relative shrink-0">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.username} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                            {member.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs font-black text-white flex items-center space-x-1.5">
                          <span>{member.username}</span>
                          {member.uid === currentUser?.uid && (
                            <span className="text-[9px] text-yellow-500 font-bold">(You)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {member.inGameName ? `IGN: ${member.inGameName}` : 'No IGN'}
                        </div>
                        <span className="inline-block mt-0.5 text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                          {member.role}
                        </span>
                      </div>
                    </div>

                    {/* Remove button for Captain on every member */}
                    {isCurrentCaptain && (
                      <button
                        onClick={() => setMemberToKick(member)}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors"
                        title={`Remove ${member.username}`}
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                ))}

                {/* Empty Slots */}
                {Array.from({ length: Math.max(0, 6 - memberList.length) }).map((_, i) => (
                  <div
                    key={'empty_slot_' + i}
                    className="border border-dashed border-zinc-800 rounded-xl p-3 flex items-center justify-between text-zinc-600"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full border border-dashed border-zinc-700 flex items-center justify-center text-xs">
                        +
                      </div>
                      <span className="text-xs font-bold">Open Squad Slot</span>
                    </div>
                    {isCurrentCaptain && (
                      <button
                        onClick={handleOpenAddMember}
                        className="text-[10px] font-bold text-yellow-500 hover:underline"
                      >
                        + Invite Player
                      </button>
                    )}
                  </div>
                ))}

                {/* ============================================================ */}
                {/* PENDING JOIN REQUESTS (VIA TEAM CODE) - CAPTAIN APPROVAL     */}
                {/* ============================================================ */}
                {isCurrentCaptain && (
                  <div className="pt-3 mt-1 border-t border-yellow-500/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="relative flex h-2 w-2">
                          {incomingTeamRequests.length > 0 && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                          )}
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${incomingTeamRequests.length > 0 ? 'bg-yellow-500' : 'bg-zinc-600'}`}></span>
                        </span>
                        <h4 className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center">
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Join Requests ({incomingTeamRequests.length})
                        </h4>
                      </div>
                      {incomingTeamRequests.length > 0 ? (
                        <span className="text-[9px] bg-yellow-500/20 text-yellow-400 font-bold px-2 py-0.5 rounded-full border border-yellow-500/30 animate-pulse">
                          Waiting Approval
                        </span>
                      ) : (
                        <span className="text-[9px] text-zinc-500 font-bold">
                          0 Pending
                        </span>
                      )}
                    </div>

                    {incomingTeamRequests.length === 0 ? (
                      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 text-center">
                        <p className="text-[11px] text-zinc-500 leading-relaxed">
                          No pending requests. When players use team code <strong className="text-yellow-500/90 font-mono">{selectedTeam.code}</strong>, their join request will appear here for your approval.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {incomingTeamRequests.map((req) => (
                          <div
                            key={req.id}
                            className="bg-black/70 border border-yellow-500/30 rounded-xl p-2.5 space-y-2 shadow-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-full border border-zinc-700 bg-zinc-800 overflow-hidden relative shrink-0">
                                  {req.invitedAvatar ? (
                                    <img
                                      src={req.invitedAvatar}
                                      alt={req.invitedUsername}
                                      className="w-full h-full rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-black text-yellow-400">
                                      {req.invitedUsername.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="text-xs font-black text-white truncate flex items-center space-x-1.5">
                                    <span>{req.invitedUsername}</span>
                                    <span className="text-[8px] bg-yellow-500/20 text-yellow-400 font-bold px-1.5 py-0.2 rounded border border-yellow-500/30">
                                      Code Request
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-zinc-400 truncate">
                                    {req.invitedInGameName ? `IGN: ${req.invitedInGameName}` : 'No In-Game Name'}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Accept / Reject Buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
                              <button
                                onClick={() => handleCaptainRejectRequest(req.id, req.invitedUsername)}
                                disabled={processingInviteId === req.id}
                                className="bg-zinc-900 hover:bg-red-500/20 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 font-bold py-1.5 rounded-lg text-xs flex items-center justify-center space-x-1 transition-colors disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                              <button
                                onClick={() => handleCaptainAcceptRequest(req)}
                                disabled={processingInviteId === req.id}
                                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-black py-1.5 rounded-lg text-xs flex items-center justify-center space-x-1 transition-all shadow-sm shadow-yellow-500/20 disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>{processingInviteId === req.id ? 'Accepting...' : 'Accept'}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* For Regular Members: Leave Team Button */}
              {!isCurrentCaptain && (
                <div className="pt-2 border-t border-zinc-800 shrink-0">
                  <button
                    onClick={() => {
                      setShowMembersModal(false);
                      setShowLeaveConfirm(true);
                    }}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Squad</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 5. ADD MEMBER / USER SEARCH MODAL (Triggered by + Add Member) */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showAddMemberModal && selectedTeam && (
          <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/30 rounded-2xl w-full max-w-sm p-5 space-y-3.5 shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 shrink-0">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-black text-yellow-500 uppercase tracking-wider">
                    Invite Players to Squad
                  </h3>
                </div>
                <button 
                  onClick={() => setShowAddMemberModal(false)}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search player username..."
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {loadingUsers ? (
                  <div className="py-8 text-center text-zinc-500 text-xs flex flex-col items-center justify-center space-y-2">
                    <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    <span>Searching players...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs">
                    No players found matching "{userSearchQuery}".
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isAlreadyMember = selectedTeam.members?.[u.uid] !== undefined;
                    const isInviteSent = sentInvitesMap[u.uid];

                    return (
                      <div 
                        key={u.uid}
                        className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-2.5 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 overflow-hidden relative shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.username} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-white truncate">
                              {u.username}
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate">
                              {u.inGameName ? `IGN: ${u.inGameName}` : `Wins: ${u.totalEarnings || 0} Coins`}
                            </div>
                          </div>
                        </div>

                        {/* Action Status / Button */}
                        <div>
                          {isAlreadyMember ? (
                            <span className="text-[9px] font-bold bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg">
                              In Squad
                            </span>
                          ) : isInviteSent ? (
                            <span className="text-[9px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded-lg flex items-center space-x-1">
                              <Check className="w-3 h-3" />
                              <span>Sent</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendInviteToUser(u)}
                              className="bg-yellow-500 hover:bg-yellow-400 text-black font-black px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 transition-all shadow-sm"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Invite</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 6. KICK CONFIRMATION MODAL                                   */}
      {/* ============================================================ */}
      <AnimatePresence>
        {memberToKick && (
          <div className="fixed inset-0 z-[140] bg-black/80 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-red-500/40 rounded-2xl w-full max-w-xs p-5 space-y-4 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <UserX className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Remove {memberToKick.username}?
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Are you sure you want to remove <strong className="text-white">{memberToKick.username}</strong> ({memberToKick.role}) from this squad?
                </p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setMemberToKick(null)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold py-2 rounded-xl text-xs hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmKick}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl text-xs shadow-lg shadow-red-600/30"
                >
                  Yes, Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 7. DELETE TEAM CONFIRMATION MODAL                            */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[140] bg-black/80 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-red-500/40 rounded-2xl w-full max-w-xs p-5 space-y-4 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Delete {selectedTeam?.name}?
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  This will permanently delete this squad and its chat history for all players. This action cannot be undone.
                </p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold py-2 rounded-xl text-xs hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl text-xs shadow-lg shadow-red-600/30"
                >
                  Delete Team
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 8. LEAVE TEAM CONFIRMATION MODAL                             */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <div className="fixed inset-0 z-[140] bg-black/80 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-red-500/40 rounded-2xl w-full max-w-xs p-5 space-y-4 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Leave {selectedTeam?.name}?
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Are you sure you want to leave this team? You will need the 6-character code to join back.
                </p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold py-2 rounded-xl text-xs hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLeave}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl text-xs shadow-lg shadow-red-600/30"
                >
                  Leave Team
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 9. CLEAR CHAT CONFIRMATION MODAL (Captain Only)              */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showClearChatConfirm && (
          <div className="fixed inset-0 z-[140] bg-black/80 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/40 rounded-2xl w-full max-w-xs p-5 space-y-4 text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center mx-auto">
                <Eraser className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Clear Team Chat?
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Are you sure you want to clear all chat messages in <strong className="text-yellow-400">{selectedTeam?.name}</strong>? This cannot be undone.
                </p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowClearChatConfirm(false)}
                  disabled={isClearingChat}
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold py-2 rounded-xl text-xs hover:bg-zinc-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClearChat}
                  disabled={isClearingChat}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black py-2 rounded-xl text-xs shadow-lg shadow-yellow-500/20 disabled:opacity-50"
                >
                  {isClearingChat ? 'Clearing...' : 'Yes, Clear'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 10. CREATE TEAM POPUP MODAL                                  */}
      {/* ============================================================ */}
      <AnimatePresence>
        {activeAction === 'CREATE' && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/30 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative overflow-hidden"
            >
              {/* Golden background aura */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-bl-full pointer-events-none" />

              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-black">
                    +
                  </div>
                  <h3 className="text-sm font-black uppercase text-yellow-500 tracking-wider">
                    Create New Squad
                  </h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setActiveAction('NONE')}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTeam} className="space-y-4">
                {/* LOGO UPLOAD OPTION */}
                <div className="flex flex-col items-center justify-center space-y-2 py-2">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">
                    Team Logo
                  </label>
                  <div className="relative group cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLogo}
                      disabled={isUploadingLogo}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-700 group-hover:border-yellow-500 bg-zinc-900 flex flex-col items-center justify-center overflow-hidden transition-all relative">
                      {isUploadingLogo ? (
                        <div className="flex flex-col items-center space-y-1">
                          <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-[8px] text-zinc-500">Uploading...</span>
                        </div>
                      ) : newTeamLogo ? (
                        <>
                          <img src={newTeamLogo} alt="Team Logo" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload className="w-4 h-4 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center space-y-1 text-zinc-500 group-hover:text-yellow-500 transition-colors">
                          <Upload className="w-5 h-5" />
                          <span className="text-[8px] font-bold uppercase tracking-wider text-center px-1">Upload Logo</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Small floating edit icon */}
                    {!isUploadingLogo && (
                      <div className="absolute bottom-0 right-0 bg-yellow-500 text-black p-1 rounded-full shadow-md">
                        <Upload className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                  {newTeamLogo && (
                    <button
                      type="button"
                      onClick={() => setNewTeamLogo('')}
                      className="text-[10px] text-red-400 hover:text-red-300 font-bold transition-colors"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>

                {/* TEAM NAME INPUT */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Team Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={25}
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Enter Team Name..."
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    autoFocus
                  />
                </div>

                <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-2.5 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    You will become the <strong className="text-yellow-400">Team Captain</strong>. A unique <strong className="text-yellow-400">6-character code (e.g. PK4920)</strong> will be generated so other players can join your squad.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !newTeamName.trim() || isUploadingLogo}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black py-3 rounded-xl text-xs uppercase tracking-wider hover:opacity-95 disabled:opacity-50 transition-opacity shadow-lg"
                >
                  {isSubmitting ? 'Creating Team...' : 'Create Team & Get Code'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 11. JOIN TEAM POPUP MODAL                                    */}
      {/* ============================================================ */}
      <AnimatePresence>
        {activeAction === 'JOIN' && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-yellow-500/30 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative overflow-hidden"
            >
              {/* Golden background aura */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-bl-full pointer-events-none" />

              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-yellow-500/20 text-yellow-500 flex items-center justify-center text-xs font-black">
                    #
                  </div>
                  <h3 className="text-sm font-black uppercase text-yellow-500 tracking-wider">
                    Join Team with Code
                  </h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setActiveAction('NONE')}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleJoinTeam} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Enter 6-Character Squad Code
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PK4920"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-500 rounded-xl px-3.5 py-2.5 text-center text-lg font-mono tracking-widest text-yellow-400 placeholder-zinc-700 focus:outline-none transition-colors uppercase"
                    autoFocus
                  />
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2.5 text-[11px] text-zinc-300 leading-relaxed flex items-start space-x-2">
                  <Shield className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  <span>
                    Code enter krne ke baad aapki <strong>Join Request</strong> Captain ke paas jayegi. Captain ke <strong>Accept</strong> krne ke baad hi aap squad mein add honge.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || joinCode.trim().length < 4}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black py-3 rounded-xl text-xs uppercase tracking-wider hover:opacity-95 disabled:opacity-50 transition-opacity shadow-lg flex items-center justify-center space-x-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Sending Request...' : 'Send Join Request to Captain'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

</>)}
    </div>
  );
}

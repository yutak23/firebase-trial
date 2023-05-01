import { strict as assert } from 'node:assert';
import {
	doc,
	collection,
	getDoc,
	getDocs,
	query,
	collectionGroup,
	where
} from 'firebase/firestore';

import { db } from '@/firebase';
import { converter } from '@/firebase/store';

const fetchGroup = async (options = {}) => {
	assert.ok(options.groupId, 'groupId is required');
	const { groupId } = options;

	const groupDocSnap = await getDoc(
		doc(db, 'groups', groupId).withConverter(converter)
	);

	if (!groupDocSnap.exists()) return null;
	return groupDocSnap.data();
};

const fetchGroupMembers = async (options = {}) => {
	assert.ok(options.groupId, 'groupId is required');
	const { groupId } = options;

	const memberUserListRef = collection(
		db,
		'groups',
		groupId,
		'member_users'
	).withConverter(converter);

	const memberUsers = [];
	const memberUserListSnaps = await getDocs(memberUserListRef);
	memberUserListSnaps.docs.forEach((snap) => {
		memberUsers.push(snap.data());
	});

	return memberUsers;
};

const fetchGroupInvites = async (options = {}) => {
	assert.ok(options.groupId, 'groupId is required');
	const { groupId } = options;

	const invitesListRef = collection(
		db,
		'groups',
		groupId,
		'invites'
	).withConverter(converter);

	const invites = [];
	const inviteListSnaps = await getDocs(invitesListRef);
	inviteListSnaps.forEach((snap) => {
		invites.push(snap.data());
	});

	return invites;
};

const fetchMyInvites = async (options = {}) => {
	assert.ok(options.email, 'email is required');
	const { email } = options;

	const q = query(
		collectionGroup(db, 'invites').withConverter(converter),
		where('invited_user_email', '==', email)
	);
	const querySnapshots = await getDocs(q);

	const invites = [];
	querySnapshots.forEach((querySnapshot) => {
		invites.push({ id: querySnapshot.id, ...querySnapshot.data() });
	});
	return invites;
};

export { fetchGroup, fetchGroupMembers, fetchGroupInvites, fetchMyInvites };

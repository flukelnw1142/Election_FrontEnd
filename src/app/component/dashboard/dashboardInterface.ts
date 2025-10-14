export interface Winner {
  key: string;
  party: string;
  areaID: number;
  name: string;
  score: number;
}

export interface Candidate {
  logoURL: string;
  fullname: string;
  party_name: string;
  totalVotes: number;
  province: string;
  zone: number;
  canditID: number;
  avatarURL: string;
  progress: number;
  total_votes_in_area: number;
  vote_percentage: number;
  no: number;
}

export interface Color {
  ID: number;
  PARTY_NAME: string;
  COLOR: string;
  IMG_PARTY: string;
  IMG_HEAD: string;
}

export interface PartySeatCountList {
  partyID: number;
  partyName: string;
  zone_seats: number;
  total_party_votes: number;
  partylist_seats: number;
  ranking: number;
}

export interface CandidatePartyList {
  id: number;
  no: number;
  title: string;
  firstName: string;
  lastName: string;
  fullName: string;
  active: string;
  partyID: number;
  avatarURL: string;
  updateAt: string;
}

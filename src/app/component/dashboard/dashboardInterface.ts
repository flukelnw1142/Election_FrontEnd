
export interface Winner {
  party: string;
  areaID: number;
  name: string;
  score: number;
}

export interface Candidate {
  logoURL: string;
  avatarURL: string;
  fullname: string;
  party_name: string;
  totalVotes: number;
  province: string;
  zone: number;
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

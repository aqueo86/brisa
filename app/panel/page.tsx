import Dashboard from '../dashboard';
import {requireChatGPTUser} from '../chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Panel(){await requireChatGPTUser('/panel');return <Dashboard/>;}

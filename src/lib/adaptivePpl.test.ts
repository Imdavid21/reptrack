import {describe,it,expect} from 'vitest';
import {adaptSession,calculateReadiness,nextSession,PPL_PROGRAM,warmupSets,nextSet,sessionKeyFromWorkout} from './adaptivePpl';
const base={sleep:8,soreness:{},joints:{},fatigue:3,motivation:8};
describe('adaptive PPL',()=>{
 it('advances by completion sequence, not weekday',()=>{expect(nextSession('legs_a')).toBe('push_b');expect(nextSession('recovery')).toBe('push_a')});
 it('recovers the sequence from existing workout history',()=>{expect(sessionKeyFromWorkout(null,'Pull A')).toBe('pull_a');expect(nextSession(sessionKeyFromWorkout(null,'Pull A')!)).toBe('legs_a');expect(sessionKeyFromWorkout('push_b','anything')).toBe('push_b')});
 it('classifies recovery conservatively',()=>{expect(calculateReadiness(base,'push_a').band).toBe('green');expect(calculateReadiness({...base,sleep:6},'push_a').band).toBe('yellow');expect(calculateReadiness({...base,joints:{knee:6}},'legs_a').band).toBe('red')});
 it('removes intensity techniques and volume when impaired',()=>{const normal=PPL_PROGRAM.push_b;expect(adaptSession(normal,'yellow').exercises.some(e=>e.name.includes('Drop Set'))).toBe(false);expect(adaptSession(normal,'yellow').duration).toBeLessThan(normal.duration)});
 it('generates non-fatiguing ramp sets',()=>{expect(warmupSets(70)).toEqual([{load:20,reps:12},{load:37.5,reps:8},{load:50,reps:5},{load:60,reps:3}])});
 it('decides the next set from reps and RIR',()=>{expect(nextSet(70,8,3,5,8).load).toBe(72.5);expect(nextSet(70,4,0,5,8).load).toBe(67.5);expect(nextSet(70,6,1,5,8).load).toBe(70)});
});

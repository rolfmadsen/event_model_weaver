import { Node, ElementType } from '../types';

interface ConnectionRule {
  source: ElementType;
  target: ElementType;
  verb: string;
  description: string;
}

const connectionRules: ConnectionRule[] = [
  { source: ElementType.Trigger, target: ElementType.Command, verb: 'invokes', description: 'Triggers invoke Commands.' },
  { source: ElementType.Command, target: ElementType.Aggregate, verb: 'handled by', description: 'Commands are handled by Aggregates.' },
  { source: ElementType.Aggregate, target: ElementType.Event, verb: 'produces', description: 'Aggregates produce Events.' },
  { source: ElementType.Event, target: ElementType.View, verb: 'updates', description: 'Events update Views.' },
  { source: ElementType.Event, target: ElementType.Policy, verb: 'handled by', description: 'Events are handled by Policies.' },
  { source: ElementType.Policy, target: ElementType.Command, verb: 'issues', description: 'Policies can issue new Commands.' },
  { source: ElementType.View, target: ElementType.Trigger, verb: 'causes', description: 'Views can cause automated Triggers.' },
];

class ValidationService {
  public getConnectionRule(source: Node, target: Node): ConnectionRule | undefined {
    if (!source || !target) return undefined;
    
    return connectionRules.find(rule => 
      rule.source === source.type && rule.target === target.type
    );
  }
  
  public isValidConnection(source: Node, target: Node): boolean {
    return !!this.getConnectionRule(source, target);
  }

  public getRules(): readonly ConnectionRule[] {
    return connectionRules;
  }
}

const validationService = new ValidationService();
export default validationService;
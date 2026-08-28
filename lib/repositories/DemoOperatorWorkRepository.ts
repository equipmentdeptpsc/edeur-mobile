import { mockRepository } from '../mockRepository';
import type { CanonicalOperatorWork, CanonicalSessionIdentity } from '../canonical/contracts.generated';
import type { OperatorWorkRepository } from './OperatorWorkRepository';
export class DemoOperatorWorkRepository implements OperatorWorkRepository {
  readonly kind = 'DEMO' as const;
  async getCurrentWork(identity: CanonicalSessionIdentity): Promise<CanonicalOperatorWork | null> {
    const assignment=mockRepository.getOperatorAssignment(identity.operatorId),rental=mockRepository.getRentalForOperator(identity.operatorId);if(!assignment||!rental)return null;
    const equipment=mockRepository.getEquipment(assignment.equipmentId);if(!equipment)return null;const open=mockRepository.getResumableDeurForOperator(identity.operatorId);
    return {identity,assignment:{id:assignment.id,projectId:assignment.projectId,status:assignment.status},equipment:{id:equipment.id,name:equipment.name,assetNumber:equipment.assetNumber,currentReading:equipment.hourMeter},rental:{id:rental.id,rentalNumber:rental.rentalNumber,status:rental.status,billingMethod:rental.billingMethod},rentalLine:{id:`demo-line:${rental.id}:${equipment.id}`,status:rental.status,operationalMetadata:{}},...(open?{openDeur:{id:open.id,deurNumber:open.deurNumber,workDate:open.date,status:open.status,rowVersion:0,operatorId:open.operatorId}}:{})};
  }
}

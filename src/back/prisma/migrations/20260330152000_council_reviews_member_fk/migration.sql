-- Add FK for CouncilReview.memberId -> CouncilMembership.id
-- Required for score-summary aggregation (CouncilService.getScoreSummary).

ALTER TABLE `council_reviews`
  ADD CONSTRAINT `council_reviews_memberId_fkey`
  FOREIGN KEY (`memberId`)
  REFERENCES `council_memberships`(`id`)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
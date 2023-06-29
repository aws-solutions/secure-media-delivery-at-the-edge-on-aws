import * as appreg from '@aws-cdk/aws-servicecatalogappregistry-alpha';
import {
  Aws,
  CfnMapping,
  Fn,
  Stack,
  Tags,
} from 'aws-cdk-lib';
import { IConfiguration } from '../../helpers/validators/configuration';

export function applyAppRegistry(stack: Stack, solutionConfig: IConfiguration) {
  const map = new CfnMapping(stack, "Solution");
  map.setValue("Data", "ID", solutionConfig.solutionId);
  map.setValue("Data", "Version", solutionConfig.solutionVersion);
  map.setValue("Data", "AppRegistryApplicationName", solutionConfig.solutionName);
  map.setValue("Data", "SolutionName", solutionConfig.solutionDisplayName);
  map.setValue("Data", "ApplicationType", "AWS-Solutions");

  const application = new appreg.Application(stack, "AppRegistry", {
    applicationName: Fn.join("-", [
      map.findInMap("Data", "AppRegistryApplicationName"),
      Aws.REGION,
      Aws.ACCOUNT_ID,
      Aws.STACK_NAME,
    ]),
    description: `Service Catalog application to track and manage all your resources for the solution ${map.findInMap("Data", "SolutionName")}`,
  });
  application.associateApplicationWithStack(stack);

  Tags.of(application).add("Solutions:SolutionID", map.findInMap("Data", "ID"));
  Tags.of(application).add("Solutions:SolutionName", map.findInMap("Data", "SolutionName"));
  Tags.of(application).add("Solutions:SolutionVersion", map.findInMap("Data", "Version"));
  Tags.of(application).add("Solutions:ApplicationType", map.findInMap("Data", "ApplicationType"));

  const attributeGroup = new appreg.AttributeGroup(
    stack,
    "DefaultApplicationAttributes",
    {
      attributeGroupName: Fn.join("-", [
        Aws.REGION,
        Aws.STACK_NAME 
      ]),
      description: "Attribute group for solution information",
      attributes: {
        applicationType: map.findInMap("Data", "ApplicationType"),
        version: map.findInMap("Data", "Version"),
        solutionID: map.findInMap("Data", "ID"),
        solutionName: map.findInMap("Data", "SolutionName"),
      },
    }
  );
  attributeGroup.associateWith(application);
}

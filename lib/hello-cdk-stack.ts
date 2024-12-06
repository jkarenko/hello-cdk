import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import { Construct } from 'constructs';

export class HelloCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC
    const vpc = new ec2.Vpc(this, 'HelloVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // Create a cluster
    const cluster = new ecs.Cluster(this, 'HelloCluster', {
      vpc,
      containerInsights: true,
    });

    // Create a load-balanced Fargate service
    const service = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'HelloService', {
      cluster,
      memoryLimitMiB: 512,
      cpu: 256,
      desiredCount: 1,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset('.'),
        containerPort: 8080,
        environment: {
          NODE_ENV: 'production',
        },
      },
      assignPublicIp: false,
      healthCheckGracePeriod: cdk.Duration.seconds(5),
    });

    // Configure health check to use our /health endpoint
    service.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(15),
      timeout: cdk.Duration.seconds(5),
    });

    // Create a scaling policy
    const scaling = service.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 2,
    });

    // Scale on CPU utilization
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: service.loadBalancer.loadBalancerDnsName,
      description: 'Load balancer DNS name',
    });

    new cdk.CfnOutput(this, 'ServiceURL', {
      value: `http://${service.loadBalancer.loadBalancerDnsName}/hello`,
      description: 'Hello endpoint URL',
    });
  }
}

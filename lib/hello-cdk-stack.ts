import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class HelloCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC
    const vpc = new ec2.Vpc(this, 'HelloVpc', {
      maxAzs: 2,
      natGateways: 0,
    });

    // Security group for Fargate tasks
    const fargateSecurityGroup = new ec2.SecurityGroup(this, 'FargateServiceSG', {
      vpc,
      description: 'Security group for Fargate tasks',
      allowAllOutbound: true,
    });

    fargateSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.allTraffic(),
      'Allow outbound traffic to the internet'
    );

    // Security group for ALB
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from the internet'
    );

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic from the internet'
    );

    fargateSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(albSecurityGroup.securityGroupId),
      ec2.Port.tcp(8080),
      'Allow traffic from ALB to Fargate tasks'
    );

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'HelloCluster', {
      vpc,
      containerInsights: true,
    });

    // Fargate Service with ALB
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
      assignPublicIp: true,
      securityGroups: [fargateSecurityGroup],
    });

    // Attach ALB security group
    service.loadBalancer.addSecurityGroup(albSecurityGroup);

    // Health check configuration
    service.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(15),
      timeout: cdk.Duration.seconds(5),
    });

    // Autoscaling
    const scaling = service.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 2,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Flow logs with existing log group check
    const existingLogGroupName = '/vpc/flow-logs/HelloCdkStack';
    let flowLogGroup;
    try {
      flowLogGroup = logs.LogGroup.fromLogGroupName(this, 'ExistingVPCFlowLogs', existingLogGroupName);
    } catch {
      flowLogGroup = new logs.LogGroup(this, 'VPCFlowLogs', {
        logGroupName: existingLogGroupName,
        retention: logs.RetentionDays.ONE_MONTH,
      });
    }

    new ec2.FlowLog(this, 'FlowLog', {
      resourceType: ec2.FlowLogResourceType.fromVpc(vpc),
      destination: ec2.FlowLogDestination.toCloudWatchLogs(flowLogGroup),
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: service.loadBalancer.loadBalancerDnsName,
      description: 'Load Balancer DNS name',
    });

    new cdk.CfnOutput(this, 'FargateSecurityGroupId', {
      value: fargateSecurityGroup.securityGroupId,
      description: 'Fargate Security Group ID',
    });

    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID',
    });
  }
}
